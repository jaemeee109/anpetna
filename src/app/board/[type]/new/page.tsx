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
  const [secret, setSecret] = React.useState(false);

  // === 이미지 첨부 상태 ===
  const [files, setFiles] = React.useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = React.useState<string[]>([]);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  // 로그인한 작성자 아이디 자동 채우기(있으면)
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setWriter(localStorage.getItem("memberId") || "");
    }
  }, []);

  // ✅ files가 바뀔 때마다 blob URL을 만들어 state에 저장
  //    cleanup에서 해당 URL만 revoke (Strict 모드에서도 안전)
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
    // 같은 파일 다시 선택 가능하게 초기화
    e.currentTarget.value = "";
  };

  const removePicked = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

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

    const fd = new FormData();
    fd.append("json", new Blob([JSON.stringify(json)], { type: "application/json" }));
    files.forEach((f) => fd.append("files", f));

    createMut.mutate(fd, {
      onSuccess: (res: any) => {
        alert("등록 성공");
        const bno = res?.createBoard?.bno ?? res?.bno ?? res?.id ?? null;
        router.push(bno ? `/board/${type}/${bno}` : `/board/${type}`);
      },
      onError: (err: any) => {
        alert(`등록 실패\n${err?.response?.status ?? ""}`);
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

      {/* === 이미지 첨부 (내용 아래, 고정/비밀 위) === */}
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

        {/* ✅ 미리보기: previewUrls 기준으로 표시 */}
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

      {/* 고정/비밀 체크 */}
      <div className="mt-5 mb-10 flex justify-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          고정글
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} />
          비밀글
        </label>
      </div>

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
