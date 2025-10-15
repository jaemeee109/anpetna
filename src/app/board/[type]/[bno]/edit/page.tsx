// src/app/board/[type]/[bno]/edit/page.tsx
'use client';

import { use, useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useBoardDetail,
  useUpdateBoard,
} from '@/features/board/hooks/useBoards';

const WRAP = 'mx-auto w-full max-w-[700px] px-4';

/** 절대 URL 보정 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
function absUrl(p?: string) {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith('/')) return `${API_BASE}${p}`;
  return `${API_BASE}/${p}`;
}
/** ✅ 파일은 프록시를 통해(Authorization 헤더 부착) + 토큰을 ?t= 로 추가 */
function proxiedFileUrl(p?: string) {
  const absolute = absUrl(p);
  if (!absolute) return '';
  let u = `/api/file?u=${encodeURIComponent(absolute)}`;
  try {
    const t =
      typeof window !== 'undefined'
        ? localStorage.getItem('accessToken') || ''
        : '';
    if (t) u += `&t=${encodeURIComponent(t)}`;
  } catch {}
  return u;
}

type Img = {
  uuid?: number;
  url?: string;
  path?: string;
  fileName?: string;
  sortOrder?: number;
};

export default function BoardEditPage({
  params,
}: {
  params: Promise<{ type: string; bno: string }>;
}) {
  // ✅ 상세페이지와 동일하게 Promise params를 use()로 언랩(버전 혼용 문제 방지)
  const { type, bno } = use(params);
  const id = Number(bno);
  const router = useRouter();

  // 원본과 동일: 리액트쿼리 훅으로 상세 읽기/수정
  const { data: board, isLoading, error } = useBoardDetail(id);
  const updateMut = useUpdateBoard();

  const [writer, setWriter] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false); // 고정글
  const [secret, setSecret] = useState(false); // 비밀글

  // ✅ 이미지 상태 (기존/추가/교체/삭제/순서)
  const [origImages, setOrigImages] = useState<Img[]>([]);
  const [addFiles, setAddFiles] = useState<File[]>([]);
  const [replaceMap, setReplaceMap] = useState<Map<number, File>>(new Map());
  const [deleteSet, setDeleteSet] = useState<Set<number>>(new Set());
  const addInputRef = useRef<HTMLInputElement | null>(null);

  // 서버 데이터 들어오면 state 초기화 (원본 로직 그대로)
  useEffect(() => {
    if (!board) return;
    setWriter(
      (board as any).bWriter ??
        (board as any).writer ??
        (board as any).bwriter ??
        ''
    );
    setTitle(
      (board as any).bTitle ?? (board as any).title ?? (board as any).btitle ?? ''
    );
    setContent(
      (board as any).bContent ??
        (board as any).content ??
        (board as any).bcontent ??
        ''
    );
    setPinned(Boolean((board as any).noticeFlag));
    setSecret(Boolean((board as any).isSecret));

    const imgs: Img[] = Array.isArray((board as any).images)
      ? (board as any).images
      : [];
    setOrigImages(imgs);
    setAddFiles([]);
    setReplaceMap(new Map());
    setDeleteSet(new Set());
  }, [board]);

  /** ✅ 추가 파일 미리보기 (교체용 파일은 여기서 자동 제외해 중복 방지) */
  const replacementFilesSet = useMemo(() => {
    const s = new Set<File>();
    replaceMap.forEach((f) => s.add(f));
    return s;
  }, [replaceMap]);

  const previewAdd = useMemo(() => {
    const onlyPureAdds = addFiles.filter((f) => !replacementFilesSet.has(f));
    return onlyPureAdds.map((f) => URL.createObjectURL(f));
  }, [addFiles, replacementFilesSet]);

  useEffect(() => {
    return () => {
      previewAdd.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewAdd]);

  /** ✅ 교체 파일 미리보기: uuid -> objectURL 매핑 */
  const previewReplaceMap = useMemo(() => {
    const m = new Map<number, string>();
    replaceMap.forEach((file, uuid) => {
      m.set(uuid, URL.createObjectURL(file));
    });
    return m;
  }, [replaceMap]);

  useEffect(() => {
    return () => {
      previewReplaceMap.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewReplaceMap]);

  if (isLoading) return <div className={WRAP}>로딩중…</div>;
  if (error || !board) return <div className={WRAP}>글을 불러오지 못했어요.</div>;

  const onPickAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setAddFiles((prev) => [...prev, ...files]);
    e.currentTarget.value = '';
  };

  const onReplaceOne = (uuid: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = (input.files && input.files[0]) || null;
      if (file) {
        setReplaceMap((prev) => {
          const n = new Map(prev);
          n.set(uuid, file);
          return n;
        });
        // 교체 시: 원본 uuid는 삭제 대상으로 표시 + 업로드 파일 목록에 추가(서버 업로드용)
        setDeleteSet((prev) => new Set(prev).add(uuid));
        setAddFiles((prev) => [...prev, file]);
      }
    };
    input.click();
  };

  const onRemoveOne = (uuid: number) => {
    setDeleteSet((prev) => new Set(prev).add(uuid));
    setReplaceMap((prev) => {
      const n = new Map(prev);
      n.delete(uuid);
      return n;
    });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();

    const json = {
      bno: id,
      bWriter: writer,
      bTitle: title,
      bContent: content,
      noticeFlag: pinned,
      isSecret: secret,
    };

    const remaining = origImages.filter(
      (img) => !(img.uuid != null && deleteSet.has(img.uuid))
    );
    const orders =
      remaining
        .map((img, i) =>
          img.uuid != null ? { uuid: img.uuid, sortOrder: i } : null
        )
        .filter(Boolean) ?? [];

    const fd = new FormData();
    fd.append(
      'json',
      new Blob([JSON.stringify(json)], { type: 'application/json' })
    );
    addFiles.forEach((f) => fd.append('addFiles', f));
    if (deleteSet.size > 0) {
      fd.append(
        'deleteUuids',
        new Blob([JSON.stringify(Array.from(deleteSet.values()))], {
          type: 'application/json',
        })
      );
    }
    if (orders.length > 0) {
      fd.append(
        'orders',
        new Blob([JSON.stringify(orders)], { type: 'application/json' })
      );
    }

    // useUpdateBoard 훅이 FormData 그대로 전송 (원본 로직 유지)
    updateMut.mutate(
      { bno: id, formData: fd } as any,
      {
        onSuccess: () => {
          alert('수정되었습니다.');
          router.push(`/board/${type}/${bno}`);
        },
        onError: () => {
          alert('수정 실패… 입력값을 확인해주세요.');
        },
      }
    );
  };

  return (
    <section className={WRAP}>
      {/* 제목 */}
      <div className="mt-[40px] mb-[20px] flex items-center gap-3">
        <span className="w-16 shrink-0 text-base text-gray-700">
          제목&nbsp;:&nbsp;
        </span>
        <input
          className="flex-1 bg-transparent border-0 outline-none focus:ring-0 placeholder-gray-400"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          required
        />
      </div>

      {/* 작성자 (읽기 전용) */}
      <div className="mt-4 mb-[20px] flex items-center gap-3">
        <span className="w-16 shrink-0 text-base text-gray-700">
          작성자&nbsp;:&nbsp;
        </span>
        <input
          className="flex-1 bg-transparent border-0 outline-none text-gray-800 select-none"
          value={writer}
          readOnly
        />
      </div>

      {/* 내용 */}
      <div className="mt-8">
        <textarea
          className="h-56 w-full rounded border border-gray-300 px-7 py-6 text-base outline-none focus:ring-2 focus:ring-gray-200"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요"
          required
        />
      </div>

      {/* ✅ 첨부 이미지(기존) — 프록시 URL로 미리보기, 교체 시 즉시 반영 */}
      {origImages.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-sm text-gray-700">첨부 이미지</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {origImages.map((img) => {
              const uuid = img.uuid!;
              const raw =
                img.url ??
                img.path ??
                (img as any).imageUrl ??
                (img as any).src ??
                '';
              // 교체 선택된 경우: 교체 파일의 미리보기 URL을 우선 사용
              const swapped = uuid != null ? previewReplaceMap.get(uuid) : undefined;
              const src = swapped || proxiedFileUrl(raw);
              return (
                <div key={uuid ?? src} className="border rounded p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={img.fileName ?? `image-${uuid ?? 'x'}`}
                    className="w-full h-40 object-cover rounded mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-3d btn-white px-3 py-1 text-xs"
                      onClick={() => onReplaceOne(uuid)}
                    >
                      교체
                    </button>
                    <button
                      type="button"
                      className="btn-3d btn-white px-3 py-1 text-xs"
                      onClick={() => onRemoveOne(uuid)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 새 이미지 추가 */}
      <div className="mt-4 mb-[10px]">
        <input
          ref={addInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onPickAdd}
          className="hidden"
        />
        <button
          type="button"
          className="btn-3d btn-white px-4 py-2 text-sm"
          onClick={() => addInputRef.current?.click()}
        >
          이미지 추가
        </button>
      </div>

      {/* ✅ 새로 추가한 파일 미리보기 (교체용 파일은 제외하여 중복 방지) */}
      {previewAdd.length > 0 && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
          {previewAdd.map((src, i) => (
            <div key={`add-${i}`} className="relative border border-gray-200 rounded p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`p-${i}`} className="w-full h-28 object-cover rounded" />
            </div>
          ))}
        </div>
      )}

      {/* 고정글 / 비밀글 */}
      <div className="mt-[20px] mb-[50px] flex justify-center gap-[10px]">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
          />
          고정글
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={secret}
            onChange={(e) => setSecret(e.target.checked)}
          />
          비밀글
        </label>
      </div>

      {/* 버튼 영역 */}
      <form onSubmit={onSubmit} className="mt-10 mb-[40px]">
        <div className="flex justify-center gap-[5px]">
          <button
            className="btn-3d btn-white px-4 py-2 text-sm"
            disabled={updateMut.isPending}
          >
            {updateMut.isPending ? '저장 중...' : '저장'}
          </button>
          <Link
            href={`/board/${type}/${bno}`}
            className="btn-3d btn-white px-4 py-2 text-sm no-underline"
            prefetch={false}
          >
            취소
          </Link>
        </div>
      </form>
    </section>
  );
}
