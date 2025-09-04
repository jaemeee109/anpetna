// src/app/board/[type]/[bno]/page.tsx
'use client';

import { use } from "react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  useBoardDetail,
  useLikeBoard,
  useRemoveBoard,
} from "@/features/board/hooks/useBoards";
import {
  useComments,
  useCreateComment,
  useRemoveComment,
  useLikeComment,
  useUpdateComment,
} from "@/features/board/hooks/useComments";
import { normalizeCommentPage } from "@/features/board/data/comment.api";

const WRAP = "mx-auto w-full max-w-[960px] px-4";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  "http://192.168.0.160:8000";

function absUrl(p?: string) {
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith("/")) return `${API_BASE}${p}`;
  return `${API_BASE}/${p}`;
}

/** 프록시로 보내면서 로컬 토큰을 ?t= 로 붙여줌 (이미지 X박스/401 회피) */
function proxiedFileUrl(p?: string) {
  const absolute = absUrl(p);
  if (!absolute) return "";
  let u = `/api/file?u=${encodeURIComponent(absolute)}`;
  try {
    const t =
      typeof window !== "undefined" ? localStorage.getItem("accessToken") || "" : "";
    if (t) u += `&t=${encodeURIComponent(t)}`;
  } catch {}
  return u;
}

export default function BoardDetailPage({
  params,
}: {
  params: Promise<{ type: string; bno: string }>;
}) {
  const { type, bno } = use(params);
  const router = useRouter();
  const id = Number(bno);

  // 비로그인 접근 차단(목록만 허용)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasToken =
      !!localStorage.getItem("Authorization") ||
      !!localStorage.getItem("accessToken");
    if (!hasToken) {
      alert("로그인 후 이용해주세요.");
      router.replace(`/board/${type}`);
    }
  }, [router, type]);

  const me =
    typeof window !== "undefined" ? localStorage.getItem("memberId") || "" : "";

  const { data: board, isLoading, error } = useBoardDetail(id);
  const likeMut = useLikeBoard();
  const removeBoardMut = useRemoveBoard();

  const { data: comm, isLoading: commLoading } = useComments(id, 1, 20);
  const createMut = useCreateComment();
  const removeMut = useRemoveComment(id);
  const likeCommMut = useLikeComment(id);
  const updateCommMut = useUpdateComment(id);

  const [commWriter, setCommWriter] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("memberId") || "" : ""
  );
  const [commContent, setCommContent] = useState("");
  const [editingCno, setEditingCno] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  if (isLoading) return <div className={WRAP}>로딩중…</div>;
  if (error) return <div className={WRAP}>에러가 발생했어요</div>;
  if (!board) return <div className={WRAP}>글이 존재하지 않습니다</div>;

  const title =
    (board as any).bTitle ??
    (board as any).title ??
    (board as any).btitle ??
    "(제목 없음)";
  const writer =
    (board as any).bWriter ??
    (board as any).writer ??
    (board as any).bwriter ??
    "-";
  const rawCreated =
    (board as any).createDate ??
    (board as any).createdAt ??
    (board as any).regDate;
  const createdText = rawCreated ? safeDate(rawCreated) : "-";
  const bodyContent =
    (board as any).bContent ??
    (board as any).content ??
    (board as any).bcontent ??
    "";
  const likeCount =
    (board as any).bLikeCount ??
    (board as any).likeCount ??
    (board as any).blikeCount ??
    0;

  /** 첨부 이미지: 프록시 URL 사용(+토큰) */
  const images: any[] = Array.isArray((board as any).images)
    ? (board as any).images
    : [];
  const displayImages = images
    .map((img: any, i: number) => {
      const raw =
        img.url ?? img.imageUrl ?? img.path ?? img.filePath ?? img.src ?? "";
      return {
        key: img.uuid ?? img.id ?? i,
        src: proxiedFileUrl(raw),
        alt: img.fileName ?? `image-${i}`,
      };
    })
    .filter((x) => x.src);

  const iAmWriter = me && writer && me === String(writer);

  const { dtoList: commentList } = normalizeCommentPage(comm);

  return (
    <section className={WRAP}>
      {/* ===== 기존 UI 유지 ===== */}
      <h1 className="mt-8 text-2xl font-semibold text-center">{title}</h1>
      <div className="mt-4 mb-[16px] border-t border-gray-200 px-12" />
      <div className="flex items-center justify-end gap-[14px] px-12 py-3 text-sm text-gray-600 mb-10">
        <span className="whitespace-nowrap">
          {writer} · {createdText}
        </span>

        {iAmWriter && (
          <>
            {/* ⬇️ 수정: 버튼 → 순수 <a href> (항상 이동 보장, UI 그대로) */}
            <a
              href={`/board/${type}/${bno}/edit`}
              className="btn-3d btn-white"
              onClick={(e) => e.stopPropagation()}
            >
              수정
            </a>
            <button
              type="button"
              className="btn-3d btn-white"
              disabled={removeBoardMut.isPending}
              onClick={() => {
                if (!confirm("정말 이 글을 삭제하시겠습니까?")) return;
                removeBoardMut.mutate(id, {
                  onSuccess: () => {
                    alert("삭제되었습니다.");
                    router.push(`/board/${type}`);
                  },
                  onError: () => alert("삭제 실패"),
                });
              }}
            >
              {removeBoardMut.isPending ? "삭제 중..." : "삭제"}
            </button>
          </>
        )}
      </div>

      {/* 본문 */}
      <div className="my-[80px] flex justify-center">
        <article className="w-full max-w-[720px] text-center leading-7 text-gray-900 whitespace-pre-wrap">
          {bodyContent}
        </article>
      </div>

      {/* 첨부 이미지 (있을 때만) */}
      {displayImages.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          {displayImages.map((img) => (
            <div key={img.key} className="p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.alt}
                className="max-w-[300px] h-auto object-contain mx-auto"
              />
            </div>
          ))}
        </div>
      )}

      {/* 좋아요 */}
      <div className="flex justify-center mt-[40px] mb-[64px]">
        <button
          type="button"
          onClick={() => likeMut.mutate(id)}
          className="btn-3d btn-white"
        >
          좋아요 {likeCount}
        </button>
      </div>

      <div className="border-t border-gray-200 mt-[10px] mb-[5px]" />

      {/* 댓글 작성 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!commWriter.trim() || !commContent.trim()) return;
          if (!me) {
            alert("로그인 후 이용해주세요.");
            return;
          }
          createMut.mutate(
            { bno: id, cWriter: commWriter.trim(), cContent: commContent.trim() },
            { onSuccess: () => setCommContent("") }
          );
        }}
        className="py-6 mt-[20px] mb-[12px]"
      >
        <div className="space-y-[12px]">
          <div className="flex items-center gap-5">
            <span className="text-sm text-gray-700">작성자&nbsp;:&nbsp; </span>
            <input
              value={commWriter}
              onChange={(e) => setCommWriter(e.target.value)}
              placeholder="ID를 입력해주세요"
              className="h-9 w-24 bg-transparent px-0 text-base outline-none border-0 focus:ring-0"
            />
          </div>

          <div className="relative">
            <textarea
              value={commContent}
              onChange={(e) => setCommContent(e.target.value)}
              placeholder="댓글 내용을 입력해주세요"
              rows={3}
              className="w-full rounded border border-gray-300 px-3 py-2 pr-24 text-base outline-none focus:ring-2 focus:ring-gray-200"
            />
            <button
              type="submit"
              className="btn-3d btn-white atext-sm bsolute bottom-2 right-2  mt-[10px]"
            >
              등록
            </button>
          </div>
        </div>
      </form>

      {/* 댓글 목록 */}
      <div className="mt-[10px] mb-10">
        {commLoading ? (
          <div className="py-8 text-center text-sm text-gray-500">댓글 로딩중…</div>
        ) : commentList.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500 mb-[40px]">
            댓글이 없습니다
          </div>
        ) : (
          commentList.map((c: any) => {
            const cw = c.cWriter ?? c.cwriter ?? "anonymous";
            const cc = c.cContent ?? c.ccontent ?? "";
            const lk = c.cLikeCount ?? c.clikeCount ?? 0;
            const mine = me && cw && me === String(cw);
            const isEditing = mine && editingCno === c.cno;

            return (
              <div key={c.cno} className="py-[16px] border-t border-gray-200">
                {!isEditing ? (
                  <>
                    <div className="font-bold text-black mb-[8px]">{cw}</div>
                    <div className="whitespace-pre-wrap text-gray-800 mb-[10px]">
                      {cc}
                    </div>

                    <div className="flex gap-2 text-xs text-gray-600">
                      <button
                        type="button"
                        onClick={() => likeCommMut.mutate(c.cno)}
                        className="btn-3d btn-white"
                      >
                        좋아요 {lk}
                      </button>
                      {mine && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCno(c.cno);
                              setEditText(cc);
                            }}
                            className="btn-3d btn-white"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => removeMut.mutate(c.cno)}
                            className="btn-3d btn-white"
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!editText.trim()) return;
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
                    className="flex gap-2"
                  >
                    <span className="w-28 font-bold text-sm text-gray-700">
                      {cw}
                    </span>
                    <input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 border-b border-gray-300 outline-none"
                    />
                    <button className="btn-3d btn-white">저장</button>
                    <button
                      type="button"
                      onClick={() => setEditingCno(null)}
                      className="btn-3d btn-white"
                    >
                      취소
                    </button>
                  </form>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="flex justify-center py-12">
        <button
          type="button"
          onClick={() => router.push(`/board/${type}`)}
          className="btn-3d btn-white mb-[60px]"
        >
          목록으로
        </button>
      </div>
    </section>
  );
}

function safeDate(v: string) {
  const d = new Date(v);
  if (isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}. ${m}. ${da} ${hh}:${mm}`;
}
