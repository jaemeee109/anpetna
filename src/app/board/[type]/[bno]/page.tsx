"use client";
import { use } from "react"; //  Promise 언랩용
import { useRouter } from "next/navigation";
import { useBoardDetail, useLikeBoard, useRemoveBoard } from "@/features/board/hooks/useBoards";
import {
  useComments,
  useCreateComment,
  useRemoveComment,
  useLikeComment,
  useUpdateComment,
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
  const removeBoardMut = useRemoveBoard(); // 삭제

  const { data: comm, isLoading: commLoading } = useComments(id, 1, 20);
  const createMut = useCreateComment();
  const removeMut = useRemoveComment(id);
  const likeCommMut = useLikeComment(id);
  const updateCommMut = useUpdateComment(id);




  const [commWriter, setCommWriter] = useState(() => {
  if (typeof window !== "undefined") return localStorage.getItem("memberId") || "";
  return "";
});
const [editingCno, setEditingCno] = useState<number | null>(null);
const [editText, setEditText] = useState("");
const [commContent, setCommContent] = useState("");

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

  <button
    className="px-3 py-1 border rounded text-red-600"
    disabled={removeBoardMut.isPending}
    onClick={() => {
      if (!confirm("정말 이 글을 삭제하시겠습니까?")) return;
      removeBoardMut.mutate(id, {
        onSuccess: () => {
          alert("삭제되었습니다.");
          router.push(`/board/${type}`); // 목록으로
        },
        onError: (err: any) => {
          const status = err?.response?.status;
          alert(`삭제 실패 (status: ${status ?? "?"})`);
        },
      });
    }}
  >
    {removeBoardMut.isPending ? "삭제 중..." : "삭제"}
  </button>
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
    const cw = c.cWriter ?? c.cwriter ?? "anonymous";
    const cc = c.cContent ?? c.ccontent ?? "";
    const lk = c.cLikeCount ?? c.clikeCount ?? 0;

    // 보기 모드가 기본
    const isEditing = editingCno === c.cno;

    return (
      <li key={c.cno} className="py-2">
        {/* ---- 보기 모드 ---- */}
        {!isEditing && (
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="text-sm">
                <b>{cw}</b>
              </div>
              <div className="text-gray-800 whitespace-pre-wrap">{cc}</div>
              <div className="mt-1 flex gap-2">
                <button
                  className="px-2 py-1 text-sm border rounded"
                  onClick={() => likeCommMut.mutate(c.cno)}
                >
                  좋아요 {lk}
                </button>
                <button
                  className="px-2 py-1 text-sm border rounded"
                  onClick={() => {
                    setEditingCno(c.cno);
                    setEditText(cc); // 기존 내용 채우기
                  }}
                >
                  수정
                </button>
                <button
                  className="px-2 py-1 text-sm border rounded"
                  onClick={() => removeMut.mutate(c.cno)}
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---- 수정 모드 ---- */}
        {isEditing && (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!editText.trim()) {
                alert("내용을 입력하세요.");
                return;
              }
              // 작성자 변경 안 하면 보낼 필요 없음
              updateCommMut.mutate(
                { cno: c.cno, cContent: editText.trim() },
                {
                  onSuccess: () => {
                    setEditingCno(null);
                    setEditText("");
                  },
                  onError: () => alert("댓글 수정 실패"),
                }
              );
            }}
          >
            {/* 작성자는 수정 불가(요구사항) → 표시만 */}
            <span className="text-sm text-gray-600 w-28 shrink-0">{cw}</span>
            <input
              className="border px-3 py-2 rounded flex-1"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
            />
            <button
              className="px-2 py-1 text-sm rounded bg-black text-white"
              disabled={updateCommMut.isPending}
            >
              저장
            </button>
            <button
              type="button"
              className="px-2 py-1 text-sm border rounded"
              onClick={() => {
                setEditingCno(null);
                setEditText("");
              }}
            >
              취소
            </button>
          </form>
        )}
      </li>
    );
  })}
  {commentList.length === 0 && (
    <li className="py-2 text-gray-500">첫 댓글을 남겨보세요</li>
  )}
</ul>
      )}

      <form
  onSubmit={(e) => {
    e.preventDefault();
    // 작성자/내용 모두 필수
    if (!commWriter.trim() || !commContent.trim()) {
      alert("작성자와 내용을 입력하세요.");
      return;
    }
    createMut.mutate(
      { bno: id, cWriter: commWriter.trim(), cContent: commContent.trim() },
      { onSuccess: () => setCommContent("") }
    );
  }}
  className="flex flex-col gap-2 mt-3"
>
  <div className="flex gap-2">
    <input
      value={commWriter}
      onChange={(e) => setCommWriter(e.target.value)}
      placeholder="작성자"
      className="border px-3 py-2 rounded w-40"
    />
    <input
      value={commContent}
      onChange={(e) => setCommContent(e.target.value)}
      placeholder="댓글 내용을 입력하세요"
      className="border px-3 py-2 rounded flex-1"
    />
    <button className="px-3 py-2 rounded bg-black text-white">
      등록
    </button>
  </div>
</form>
    </section>
  </div>
);
}
// utils: 날짜 포맷 "25-08-23 17:57"
function fmtK(dstr?: string | null) {
  if (!dstr) return "";
  const d = new Date(dstr);
  if (isNaN(d.getTime())) return "";
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yy}.${mm}.${dd} ${hh}:${mi}`;
}
