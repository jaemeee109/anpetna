"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useBoardDetail,
  useUpdateBoard,
} from "@/features/board/hooks/useBoards";

const WRAP = "mx-auto w-full max-w-[700px] px-4";

export default function BoardEditPage({
  params,
}: {
  params: Promise<{ type: string; bno: string }>;
}) {
  const { type, bno } = React.use(params);
  const id = Number(bno);
  const router = useRouter();

  const { data: board, isLoading, error } = useBoardDetail(id);
  const updateMut = useUpdateBoard();

  const [writer, setWriter] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [pinned, setPinned] = React.useState(false); // 고정글
  const [secret, setSecret] = React.useState(false); // 비밀글

  // 서버 데이터 들어오면 state 초기화
  React.useEffect(() => {
    if (!board) return;
    setWriter(
      (board as any).bWriter ??
        (board as any).writer ??
        (board as any).bwriter ??
        ""
    );
    setTitle(
      (board as any).bTitle ??
        (board as any).title ??
        (board as any).btitle ??
        ""
    );
    setContent(
      (board as any).bContent ??
        (board as any).content ??
        (board as any).bcontent ??
        ""
    );
    setPinned((board as any).noticeFlag ?? false);
    setSecret((board as any).isSecret ?? false);
  }, [board]);

  if (isLoading) return <div className={WRAP}>로딩중…</div>;
  if (error || !board) return <div className={WRAP}>글을 불러오지 못했어요.</div>;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMut.mutate(
      {
        bno: id,
        bWriter: writer,
        bTitle: title,
        bContent: content,
        noticeFlag: pinned,
        isSecret: secret,
      } as any,
      {
        onSuccess: () => {
          alert("수정되었습니다.");
          router.push(`/board/${type}/${bno}`);
        },
        onError: () => {
          alert("수정 실패… 입력값을 확인해주세요.");
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

      {/* 고정글 / 비밀글 체크박스 (가운데 정렬) */}
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
            {updateMut.isPending ? "저장 중..." : "저장"}
          </button>
          <Link
            href={`/board/${type}/${bno}`}
            className="btn-3d btn-white px-4 py-2 text-sm no-underline"
          >
            취소
          </Link>
        </div>
      </form>
    </section>
  );
}
