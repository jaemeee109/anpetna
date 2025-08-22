"use client";
import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBoardDetail, useUpdateBoard } from "@/features/board/hooks/useBoards";

export default function EditBoardPage({ params }: { params: Promise<{ type: string; bno: string }> }) {
  const { type, bno } = React.use(params);
  const router = useRouter();
  const id = Number(bno);
  const { data, isLoading } = useBoardDetail(id);
  const updateMut = useUpdateBoard();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(()=>{
    if (data) {
      setTitle(data.title ?? "");
      setContent(data.content ?? "");
    }
  }, [data]);

  if (isLoading) return <div>로딩중…</div>;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMut.mutate({ bno: id, title, content, type }, {
      onSuccess: () => router.push(`/board/${type}/${bno}`)
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">글 수정</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="border px-3 py-2 rounded w-full" value={title} onChange={e=>setTitle(e.target.value)} placeholder="제목" />
        <textarea className="border px-3 py-2 rounded w-full h-64" value={content} onChange={e=>setContent(e.target.value)} placeholder="내용" />
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded bg-black text-white">저장</button>
          <button type="button" onClick={()=>router.back()} className="px-3 py-2 rounded border">취소</button>
        </div>
      </form>
    </div>
  );
}
