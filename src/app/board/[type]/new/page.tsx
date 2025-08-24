"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateBoard } from "@/features/board/hooks/useBoards";
import { BoardTitle } from "@/shared/ui/BoardTitle";
// 상세/목록과 동일한 컨테이너 폭 + 가운데 정렬
const WRAP = "mx-auto w-full max-w-[700px] px-4";

export default function NewBoardPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  // Next 15 / React 19: Promise 언랩
  const { type } = React.use(params);
  const router = useRouter();
  const createMut = useCreateBoard();

  // 작성자: 로그인 시 localStorage의 memberId 사용
  const [writer, setWriter] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setWriter(localStorage.getItem("memberId") || "");
    }
  }, []);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false); // 고정글
  const [secret, setSecret] = useState(false); // 비밀글

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      bWriter: writer,
      bTitle: title,
      bContent: content,
      boardType: (type || "").toUpperCase(),
      noticeFlag: pinned,
      isSecret: secret,
    };

    createMut.mutate(payload as any, {
      onSuccess: (res: any) => {
        const bno =
          res?.createBoard?.bno ??
          res?.createBoard?.id ??
          res?.bno ??
          res?.id;
        alert("등록 성공!");
        router.push(bno ? `/board/${type}/${bno}` : `/board/${type}`);
      },
      onError: (err: any) => {
        const status = err?.response?.status;
        const data = err?.response?.data;
        alert(`등록 실패 (status: ${status})\n${JSON.stringify(data ?? err?.message, null, 2)}`);
      },
    });
  };

  return (
    <section className={WRAP}>
      {/* 제목 라인 */}
      <div className="mt-[40px] flex items-center gap-3 mb-[20px] ">
        <span className="w-16 shrink-0 text-base text-gray-700">제목&nbsp;:&nbsp;</span>
        <input
          className="flex-1 bg-transparent border-0 outline-none focus:ring-0 placeholder-gray-400"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          required
        />
      </div>

      {/* 작성자 라인 */}
      <div className="mt-4 flex items-center gap-3 mb-[20px]">
        <span className="w-16 shrink-0 text-base text-gray-700">작성자&nbsp;:&nbsp;</span>
        <input
          className="flex-1 bg-transparent border-0 outline-none focus:ring-0 placeholder-gray-400"
          value={writer}
          onChange={(e) => setWriter(e.target.value)}
          placeholder="작성자를 입력하세요"
          required
        />
      </div>

      {/* 내용 */}
      <div className="mt-8">
        <div className="mb-[20px] text-sm text-gray-700"></div>
        <textarea
          className="w-full h-56 rounded border border-gray-300 px-7 py-6 text-base outline-none focus:ring-2 focus:ring-gray-200"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요"
          required
        />
      </div>

      {/* 고정글 / 비밀글 (가운데 정렬) */}
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

      {/* 등록 / 취소 (가운데 정렬, 상세페이지와 동일한 버튼 톤) */}
      <form onSubmit={onSubmit} className="mt-8 mb-16">
        <div className="flex justify-center gap-3 mb-[50px]">
          <button
            className="btn-3d btn-white px-4 py-2 text-sm"
            disabled={createMut.isPending}
          >
            {createMut.isPending ? "등록 중..." : "등록"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-3d btn-white px-4 py-2 text-sm"
          >
            취소
          </button>
        </div>
      </form>
    </section>
  );
}
