//src/app/board/[type]/new/page.tsx
"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { useCreateBoard } from "@/features/board/hooks/useBoards";

export default function NewBoardPage() {
  const router = useRouter();
  const { type } = useParams<{ type: string }>();
  const createMut = useCreateBoard();

  const [writer, setWriter] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [pinned, setPinned] = React.useState(false);
  const isAdmin = (typeof window !== 'undefined') && ((localStorage.getItem('memberRole') || '').toUpperCase().includes('ADMIN'));
  const [secret, setSecret] = React.useState(false);

  const [files, setFiles] = React.useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = React.useState<string[]>([]);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  // 로그인한 작성자 자동 세팅
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      // 프로젝트에서 실제 저장하는 키명에 맞춰 순서대로 조회
      const id =
        localStorage.getItem("memberId") ||
        localStorage.getItem("username") ||
        localStorage.getItem("userId") ||
        "";
      setWriter(id);
    }
  }, []);

  // 미리보기 URL 관리
  React.useEffect(() => {
    if (files.length === 0) {
      setPreviewUrls([]);
      return;
    }
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    setFiles((prev) => [...prev, ...picked]);
    e.currentTarget.value = ""; // 같은 파일 다시 선택 가능
  };

  const removePicked = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  // ✅ 서버 응답 성공 판정 보강
  function isCreateOk(res: any) {
    if (!res) return false;

    // 1) 전형적인 래핑 성공
    if (res.isSuccess === true) return true;
    if (res?.result?.isSuccess === true) return true;
    if (res?.resCode && Number(res.resCode) === 200) return true;

    // 2) 엔티티 자체가 내려오는 경우 (bno가 있으면 성공으로 간주)
    const ent = res?.result ?? res;
    if (typeof ent === "object" && ent !== null) {
      if (ent.bno || ent.id) return true;
      // 생성일 필드가 같이 오면 역시 성공 가능성 큼
      if (ent.createDate || ent.createdAt) return true;
    }
    return false;
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const json = {
      bWriter: writer,
      bTitle: title,
      bContent: content,
      boardType: (type || "").toUpperCase(),
      noticeFlag: pinned,
      isSecret: secret,
    };

    // 서버가 요구하는 포맷: FormData(json + files[])
    const fd = new FormData();
    fd.append("json", new Blob([JSON.stringify(json)], { type: "application/json" }));
    files.forEach((f) => fd.append("files", f));

    // 디버그 로그
    if (process.env.NODE_ENV !== "production") {
      console.log("[createBoard] payload(json):", json);
      console.log(
        "[createBoard] files:",
        files.map((f) => f.name)
      );
    }

    // useCreateBoard는 FormData를 넘기면 그대로 전송함
    createMut.mutate(fd, {
      onSuccess: (res: any) => {
        // ✅ 여기서 성공/실패를 재판정
        const ok = isCreateOk(res);

        if (ok) {
          const result = res?.result ?? res;
          const newBno =
            result?.bno ??
            result?.id ??
            res?.createBoard?.bno ??
            null;

          alert("등록 성공");
          router.push(newBno ? `/board/${type}/${newBno}` : `/board/${type}`);
        } else {
          // 실패 메시지는 최대한 백엔드 원문 유지
          const msg =
            res?.resMessage ||
            res?.message ||
            "등록 실패";
          alert(msg);
          console.error("[createBoard] fail:", res);
        }
      },
      onError: (err: any) => {
        const msg =
          err?.response?.data?.resMessage ||
          err?.message ||
          "등록 실패";
        alert(msg);
        console.error("[createBoard] error:", err);
      },
    });
  };

  return (
    <section className="mx-auto w-full max-w-[700px] px-4">
      <div className="mt-10 mb-5 flex items-center gap-3">
        <span className="w-16 text-gray-700">제목 :</span>
        <input
          className="flex-1 bg-transparent border-0 outline-none focus:ring-0"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          required
        />
      </div>

      <div className="mb-5 flex items-center gap-3">
        <span className="w-16 text-gray-700">작성자 :</span>
        <input
          className="flex-1 bg-transparent border-0 outline-none focus:ring-0"
          value={writer}
          onChange={(e) => setWriter(e.target.value)}
          placeholder="작성자를 입력하세요"
          required
        />
      </div>

      <div className="mt-6">
        <textarea
          className="h-56 w-full rounded border border-gray-300 px-6 py-5 text-base outline-none focus:ring-2 focus:ring-gray-200"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요"
          required
        />
      </div>

      {/* 이미지 첨부 */}
      <div className="mt-4 mb-4">
        <div className="mb-2 text-sm text-gray-700">이미지 첨부</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-3d btn-white px-3 py-1 text-sm"
            onClick={() => fileRef.current?.click()}
          >
            파일 선택
          </button>
          <span className="text-xs text-gray-500">(여러 장 선택 가능)</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onPick}
        />

        {previewUrls.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-3">
            {previewUrls.map((src, i) => (
              <div key={i} className="relative border border-gray-200 rounded p-1">
                <img src={src} alt={`p-${i}`} className="w-full h-28 object-cover rounded" />
                <button
                  type="button"
                  onClick={() => removePicked(i)}
                  className="absolute top-1 right-1 text-[11px] btn-3d btn-white px-1 py-0.5"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 고정글/비밀글 — 관리자만 '고정글' 노출, 일반회원은 '비밀글'만 가운데 정렬 */}
      {isAdmin ? (
         <div className="flex gap-12" style={{ alignItems: 'center' }}>
      <label className="flex items-center gap-2 text-gray-600">
        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
        고정글
      </label>
          <label className="flex items-center gap-2 text-gray-600">
            <input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} />
            비밀글
          </label>
        </div>
      ) : (
        <div className="flex" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <label className="flex items-center gap-2 text-gray-600 mt-[40px] mb-[30px]">
            <input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} />
            비밀글
          </label>
        </div>
      )}


      <form onSubmit={onSubmit} className="mb-16 flex justify-center gap-3">
        <button className="btn-3d btn-white px-4 py-2 text-sm" disabled={createMut.isPending}>
          {createMut.isPending ? "등록 중..." : "등록"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-3d btn-white px-4 py-2 text-sm">
          취소
        </button>
      </form>
    </section>
  );
}
