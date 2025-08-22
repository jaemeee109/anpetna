"use client";
import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateBoard } from "@/features/board/hooks/useBoards";

export default function NewBoardPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = React.use(params);
  const router = useRouter();
  const createMut = useCreateBoard();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({ type, title, content }, {
      onSuccess: (res: any) => {
        const bno = res?.bno;
        router.push(bno ? `/board/${type}/${bno}` : `/board/${type}`);
      }
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{labelOf(type)} 새 글</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="border px-3 py-2 rounded w-full" value={title} onChange={e=>setTitle(e.target.value)} placeholder="제목" />
        <textarea className="border px-3 py-2 rounded w-full h-64" value={content} onChange={e=>setContent(e.target.value)} placeholder="내용" />
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded bg-black text-white">등록</button>
          <button type="button" onClick={()=>router.back()} className="px-3 py-2 rounded border">취소</button>
        </div>
      </form>
    </div>
  );
}

function labelOf(type: string) {
  switch (type) {
    case "NOTICE": return "공지사항";
    case "FAQ": return "FAQ";
    case "VOICE": return "고객소리함";
    case "FREE": return "자유게시판";
    default: return type;
  }
}
