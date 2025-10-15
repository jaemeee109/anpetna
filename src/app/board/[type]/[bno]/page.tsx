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
import { pickHttpErrorMessage } from '@/shared/data/http';

const WRAP = "mx-auto w-full max-w-[960px] px-4";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.trim();

function absUrl(p?: string) {
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith("/")) return `${API_BASE}${p}`;
  return `${API_BASE}/${p}`;
}

/** ===== 비밀글 차단 전용 뷰 ===== */
/** 아래 값들만 바꿔서 즉시 화면에서 확인할 수 있습니다 */
const SECRET_UI = {
  lineColor: '#e8e8e9ff',   // 위/아래 선 색상
  marginY: 40,              // 선과 문구 블록의 위/아래 여백(px)
  paddingY: 64,             // 블록 내부 위/아래 패딩(px)
  textColor: '#7d7f81ff',   // 문구 색상
  fontSize: 16,             // 문구 폰트 크기(px)
  buttonClass: 'btn-3d btn-white', // 목록 버튼 클래스(페이지 공통 스타일)
};

function ForbiddenSecretView({ onBack }: { onBack: () => void }) {
  return (
    <main className="mx-auto w-full max-w-[600px] px-4">
      {/* 위/아래 선 + 여백/패딩: 인라인 스타일로 강제 적용 */}
      <div
        className="border-t border-b text-center"
        style={{
          marginTop: SECRET_UI.marginY,
          marginBottom: SECRET_UI.marginY,
          paddingTop: SECRET_UI.paddingY,
          paddingBottom: SECRET_UI.paddingY,
          borderTopColor: SECRET_UI.lineColor,
          borderBottomColor: SECRET_UI.lineColor,
        }}
      >
        <span
          style={{
            color: SECRET_UI.textColor,
            fontSize: SECRET_UI.fontSize,
            fontWeight: 500,
          }}
        >
          비밀글은 열람이 불가능합니다
        </span>
      </div>

      {/* 목록 버튼: 페이지 공통 버튼 스타일 사용 */}
      <div className="text-center" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <button
          type="button"
          onClick={onBack}
          className={SECRET_UI.buttonClass}
        >
          목록으로
        </button>
      </div>
    </main>
  );
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

  // ─── 403 여부를 먼저 계산 ───
  const status = (error as any)?.status ?? (error as any)?.response?.status;
  const msg = (error as any)?.message ?? "";
  const isForbidden =
    Number(status) === 403 ||
    /(^|[^0-9])403([^0-9]|$)/.test(String(msg));

  // 상세(위의 useBoardDetail) 결과를 보고, 403/실패면 댓글 질의 끔
  const commentsEnabled = !isForbidden && !!board;
  const { data: comm, isLoading: commLoading } = useComments(id, 1, 20, commentsEnabled);

  const createMut = useCreateComment();
  const removeMut = useRemoveComment(id);
  const likeCommMut = useLikeComment(id);
  const updateCommMut = useUpdateComment(id);

  const [commContent, setCommContent] = useState("");
  const [editingCno, setEditingCno] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  if (isLoading) return <div className={WRAP}>로딩중…</div>;

  // ===== 403 응답 시: 전용 “비밀글 차단” 화면 (즉시 안내) =====
  if (isForbidden) {
    return (
      <ForbiddenSecretView onBack={() => router.push(`/board/${type}`)} />
    );
  }

  if (!board) return <div className={WRAP}>글이 존재하지 않습니다</div>;

  /** ================== 중요: 응답 표준화 ==================
   * hooks/useBoards.ts는 fetch 원본을 그대로 주고,
   * app/useBoards.ts는 { readOneBoard } 형태를 씁니다.
   * ⇒ 어떤 경우든 아래 ‘view’가 실제 게시글 객체가 되도록 통일합니다.
   */
  const view: any = (board as any)?.readOneBoard ?? board; // ← 핵심: 중첩 해제

  /** JWT payload 디코딩(실패 시 null) */
  function decodeJwtPayload(t: string) {
    try {
      const [, payload] = t.replace(/^Bearer\s+/i, '').split('.');
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch { return null; }
  }

  /** 토큰 payload에서 ADMIN 여부 판별 */
  function isAdminFromToken(raw?: string | null): boolean {
    if (!raw) return false;
    const p = decodeJwtPayload(raw);
    if (!p) return false;

    const bag: string[] = [];
    const push = (v: any) => {
      if (!v) return;
      if (Array.isArray(v)) bag.push(...v.map(String));
      else if (typeof v === 'string') bag.push(v);
    };
    push(p.roles);
    push(p.authorities);
    push(typeof p.auth === 'string' ? p.auth.split(',') : p.auth);
    push(p.role);
    push(p.memberRole);

    return bag.map(s => s.toUpperCase()).some(s => s.includes('ROLE_ADMIN') || s === 'ADMIN');
  }

  const rawToken =
  typeof window !== 'undefined'
    ? (localStorage.getItem('accessToken') ||
       localStorage.getItem('Authorization') ||
       '')
    : '';

const roleFlag =
  typeof window !== 'undefined'
    ? (localStorage.getItem('memberRole') ||
       sessionStorage.getItem('memberRole') ||
       '').toUpperCase()
    : '';

const admin = roleFlag.includes('ADMIN') || isAdminFromToken(rawToken);


  // 서버가 내려준 비밀글 여부(백엔드 ReadOneBoardRes에 포함)
  const secretFlag = !!view?.isSecret;

  // 글 작성자/표시값 계산도 view 기준으로 모두 통일
  const title =
    view.bTitle ?? view.title ?? view.btitle ?? "(제목 없음)";
  const writer =
    view.bWriter ?? view.writer ?? view.bwriter ?? "-";
  const rawCreated =
    view.createDate ?? view.createdAt ?? view.regDate;
  const createdText = rawCreated ? safeDate(rawCreated) : "-";
  const bodyContent =
    view.bContent ?? view.content ?? view.bcontent ?? "";
  const likeCount =
    view.bLikeCount ?? view.likeCount ?? view.blikeCount ?? 0;

  // 첨부 이미지
  const images: any[] = Array.isArray(view.images) ? view.images : [];
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

  const iAmWriter = !!me && !!writer && me === String(writer);

    // ===== 서버가 200을 주는 특이 케이스 대비: isSecret 보조 가드 =====
    //if (secretFlag && !iAmWriter && !admin) {
    //  return (
    //    <ForbiddenSecretView onBack={() => router.push(`/board/${type}`)} />
    //  );
   // }

  // ===== 여기부터 정상 상세 화면 (기존 UI 그대로) =====
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
        <div className="mt-6 flex flex-col items-center gap-4">
          {displayImages.map((img) => (
            <div key={img.key} className="w-full max-w-[720px] p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-auto object-contain"
              />
            </div>
          ))}
        </div>
      )}

      {/* 좋아요 */}
      <div className="flex justify-center mt-[40px] mb-[64px]">
       <button
          type="button"
          onClick={() =>
            likeMut.mutate(id, {
              onError: (err: any) => alert(pickHttpErrorMessage(err)),
            })
          }
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
          if (!commContent.trim()) return;
          if (!me) {
            alert("로그인 후 이용해주세요.");
            return;
          }
          // 서버가 토큰의 사용자로 작성자 설정
          createMut.mutate(
            { bno: id, cContent: commContent.trim() },
            { onSuccess: () => setCommContent("") }
          );
        }}
        className="py-6 mt-[20px] mb-[12px]"
      >
        <div className="space-y-[12px]">
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
        ) : normalizeCommentPage(comm).dtoList.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500 mb-[40px]">
            댓글이 없습니다
          </div>
        ) : (
          normalizeCommentPage(comm).dtoList.map((c: any) => {
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
                      onClick={() =>
                        likeCommMut.mutate(c.cno, {
                          onError: (err: any) => alert(pickHttpErrorMessage(err)),
                        })
                      }
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
