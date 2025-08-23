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
import Link from "next/link";
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

  const { data: board, isLoading, error } = useBoardDetail(id); // ✅ data: BoardDetail | undefined
  const likeMut = useLikeBoard();

  const { data: comm, isLoading: commLoading } = useComments(id, 1, 20);
  const createMut = useCreateComment();
  const removeMut = useRemoveComment(id);
  const likeCommMut = useLikeComment(id);

  const [content, setContent] = useState("");

  if (isLoading) return <div>로딩중…</div>;
  if (error) return <div>에러가 발생했어요</div>;
  if (!board) return <div>글이 존재하지 않습니다</div>;

  // ✅ 본문 키 안전 매핑
// 제목
const title =
  (board as any).bTitle ??
  (board as any).title ??
  (board as any).boardTitle ??
  (board as any).btitle ??           
  '(제목 없음)';
// 작성자
const writer =
  (board as any).bWriter ??
  (board as any).writer ??
  (board as any).bwriter ??          // ← 추가
  '-';
const rawCreated =
  (board as any).createDate ?? (board as any).createdAt ?? (board as any).regDate ?? null;
const createdText = rawCreated ? (() => {
  const d = new Date(rawCreated);
  return isNaN(d.getTime()) ? '-' : d.toLocaleString();
})() : '-';
// 본문
const bodyContent =
  (board as any).bContent ??
  (board as any).content ??
  (board as any).bcontent ??         // ← 추가
  '';
  // 좋아요 수
const likeCount =
  (board as any).bLikeCount ??
  (board as any).likeCount ??
  (board as any).blikeCount ??       // ← 추가
  0;

// ✅ 댓글 배열 안전 매핑 (page/dtoList 경로 + 키 이름 대소문자 차이 대비)
const commentList =
  (comm as any)?.page?.dtoList ??
  (comm as any)?.result?.page?.dtoList ?? // 혹시 unwrap이 다르면
  [];

return (
  <div className="space-y-6">
    <div className="flex items-center gap-3">
      <h1 className="text-2xl font-bold flex-1">{title}</h1>
      <button onClick={() => likeMut.mutate(id)} className="px-3 py-1 border rounded">
  좋아요 👍 {likeCount}
</button>
      <Link className="px-3 py-1 border rounded" href={`/board/${type}/${bno}/edit`}>
        수정
      </Link>
    </div>

    <div className="text-sm text-gray-500">
      {writer} · {createdText}
    </div>

    <article className="prose max-w-none">
      <div dangerouslySetInnerHTML={{ __html: bodyContent }} />
    </article>

    <div className="flex gap-2">
      <Link className="px-3 py-2 rounded bg-gray-100" href={`/board/${type}`}>
        목록으로
      </Link>
    </div>

    <section className="mt-8">
      <h2 className="text-lg font-semibold">댓글</h2>
      {commLoading ? (
        <div>댓글 로딩중…</div>
      ) : (
        <ul className="divide-y my-3">
          {commentList.map((c: any) => {
            const cw = c.cWriter ?? c.cwriter ?? '익명';
            const cc = c.cContent ?? c.ccontent ?? '';
            const lk = c.cLikeCount ?? c.clikeCount ?? 0;
            return (
              <li key={c.cno} className="py-2 flex items-center gap-2">
                <div className="flex-1">
                  <div className="text-sm">
                    <b>{cw}</b>
                  </div>
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {cc}
                  </div>
                </div>
                <button
                  className="px-2 py-1 text-sm border rounded"
                  onClick={() => likeCommMut.mutate(c.cno)}
                >
                  좋아요 {lk}
                </button>
                <button
                  className="px-2 py-1 text-sm border rounded"
                  onClick={() => removeMut.mutate(c.cno)}
                >
                  삭제
                </button>
              </li>
            );
          })}
          {(commentList.length === 0) && (
            <li className="py-2 text-gray-500">첫 댓글을 남겨보세요</li>
          )}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const writer =
            (typeof window !== "undefined" && localStorage.getItem("memberId")) ||
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