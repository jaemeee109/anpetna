"use client";
import { use } from "react"; // ✅ Promise 언랩용
import { useRouter } from "next/navigation";
import { useBoardDetail, useLikeBoard } from "@/features/board/hooks/useBoards";
import {
  useComments,
  useCreateComment,
  useRemoveComment,
  useLikeComment,
} from "@/features/board/hooks/useComments";
import { useState } from "react";
import type { BoardDetail } from "@/features/board/data/board.types"; // ✅ 타입 import (혹시 단언에 쓸 때 필요)

export default function BoardDetailPage({
  params,
}: {
  params: Promise<{ type: string; bno: string }>;
}) {
  const { type, bno } = use(params); // ✅ React 19 / Next 15 방식
  const router = useRouter();
  const id = Number(bno);

  const { data, isLoading, error } = useBoardDetail(id); // ✅ data: BoardDetail | undefined
  const likeMut = useLikeBoard();

  const { data: comm, isLoading: commLoading } = useComments(id, 1, 20);
  const createMut = useCreateComment();
  const removeMut = useRemoveComment(id);
  const likeCommMut = useLikeComment(id);

  const [content, setContent] = useState("");

  if (isLoading) return <div>로딩중…</div>;
  if (error) return <div>에러가 발생했어요</div>;
  if (!data) return <div>글이 존재하지 않습니다</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold flex-1">{data.bTitle}</h1>
        <button
          className="px-3 py-1 border rounded"
          onClick={() => likeMut.mutate(id)}
        >
          좋아요 👍 {data.bLikeCount ?? 0}
        </button>
        <a
          className="px-3 py-1 border rounded"
          href={`/board/${type}/${bno}/edit`}
        >
          수정
        </a>
      </div>

      <div className="text-sm text-gray-500">
        {data.bWriter} · {new Date(data.createDate).toLocaleString()}
      </div>

      <article className="prose max-w-none whitespace-pre-wrap">
        {data.bContent}
      </article>

      <div className="flex gap-2">
        <a className="px-3 py-2 rounded bg-gray-100" href={`/board/${type}`}>
          목록으로
        </a>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">댓글</h2>
        {commLoading ? (
          <div>댓글 로딩중…</div>
        ) : (
          <ul className="divide-y my-3">
            {comm?.page?.dtoList?.map((c: any) => (
              <li key={c.cno} className="py-2 flex items-center gap-2">
                <div className="flex-1">
                  <div className="text-sm">
                    <b>{c.cWriter}</b>
                  </div>
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {c.cContent}
                  </div>
                </div>
                <button
                  className="px-2 py-1 text-sm border rounded"
                  onClick={() => likeCommMut.mutate(c.cno)}
                >
                  좋아요 {c.cLikeCount}
                </button>
                <button
                  className="px-2 py-1 text-sm border rounded"
                  onClick={() => removeMut.mutate(c.cno)}
                >
                  삭제
                </button>
              </li>
            ))}
            {(!comm?.page?.dtoList || comm.page.dtoList.length === 0) && (
              <li className="py-2 text-gray-500">첫 댓글을 남겨보세요</li>
            )}
          </ul>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const writer =
              (typeof window !== "undefined" &&
                localStorage.getItem("memberId")) ||
              "anonymous";
            createMut.mutate(
              { bno: id, cWriter: writer, cContent: content },
              { onSuccess: () => setContent("") }
            );
          }}
          className="flex gap-2"
        >
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="댓글 내용을 입력하세요"
            className="border px-3 py-2 rounded w-full"
          />
          <button className="px-3 py-2 rounded bg-black text-white">
            등록
          </button>
        </form>
      </section>
    </div>
  );
}
