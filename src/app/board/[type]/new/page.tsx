"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateBoard } from "@/features/board/hooks/useBoards";

export default function NewBoardPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  // Next 15 / React 19: Promise 언랩
  const { type } = React.use(params); // 예: NOTICE / FAQ / FREE ...
  const router = useRouter();
  const createMut = useCreateBoard();

  // 작성자: 로그인 시 localStorage에 저장된 ID 사용
  const [writer, setWriter] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setWriter(localStorage.getItem("memberId") || "");
    }
  }, []);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false); // 상단 고정(noticeFlag)
  const [secret, setSecret] = useState(false); // 비밀글(isSecret)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 백엔드 CreateBoardReq(JSON) 스펙에 맞춰서 전송
    const payload = {
      bWriter: writer,
      bTitle: title,
      bContent: content,
      boardType: (type || "").toUpperCase(), // 서버 enum(BoardType)과 매칭
      noticeFlag: pinned,
      isSecret: secret,
      // images: [] // 필요하면 첨부 구현 시 추가
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
        console.error("create error >>>", err);
        alert(`등록 실패 (status: ${status})\n${JSON.stringify(data ?? err?.message, null, 2)}`);
      },
    });
  }; // ✅ 여기 onSubmit 닫기 (중요!)

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">{labelOf(type)} 새 글</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* 작성자 */}
        <div className="space-y-1">
          <label className="text-sm text-gray-600">작성자</label>
          <input
            className="border px-3 py-2 rounded w-full"
            value={writer}
            onChange={(e) => setWriter(e.target.value)}
            placeholder="작성자 아이디 또는 닉네임"
            required
          />
        </div>

        {/* 제목 */}
        <div className="space-y-1">
          <label className="text-sm text-gray-600">제목</label>
          <input
            className="border px-3 py-2 rounded w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            required
          />
        </div>

        {/* 내용 */}
        <div className="space-y-1">
          <label className="text-sm text-gray-600">내용</label>
          <textarea
            className="border px-3 py-2 rounded w-full h-56"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            required
          />
        </div>

        {/* 옵션: 상단 고정 / 비밀글 */}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
            />
            상단 고정
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

        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded bg-black text-white"
            disabled={createMut.isPending}
          >
            {createMut.isPending ? "등록 중..." : "등록"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded border"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}

function labelOf(type: string) {
  switch (type) {
    case "NOTICE":
      return "공지사항";
    case "FAQ":
      return "FAQ";
    case "VOICE":
      return "고객소리함";
    case "FREE":
      return "자유게시판";
    default:
      return type;
  }
}
