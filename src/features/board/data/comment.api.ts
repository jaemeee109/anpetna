//src/features.board/data/comment.api.ts
import http, { getAccessToken } from "@/shared/data/http";
import type { CommentDetail, CreateCommentReq, UpdateCommentReq, PageRes } from "./comment.types";

/** 공통 unwrap: data.result 또는 그대로 */
function unwrap<T>(r: any): T {
  const data = (r as any)?.data ?? r;
  return (data?.result ?? data) as T;
}

/** 응답을 항상 Page 형태로 정규화 */
export function normalizeCommentPage(raw: any): PageRes<CommentDetail> {
  const base =
    raw?.page ??
    raw?.result?.page ??
    raw?.result?.data?.page ??
    raw?.result?.data ??
    raw;

  const list =
    base?.dtoList ??
    raw?.dtoList ??
    raw?.list ??
    (Array.isArray(raw) ? raw : []) ??
    [];

  const dtoList: CommentDetail[] = Array.isArray(list) ? list : [];
  const total =
    base?.total ??
    raw?.total ??
    (Array.isArray(dtoList) ? dtoList.length : 0);

  const page = Number(base?.page ?? raw?.page ?? 1) || 1;
  const size = Number(base?.size ?? raw?.size ?? 20) || 20;

  return { dtoList, total, page, size };
}

/** 목록: GET /comment/read?bno=&page=&size= */
export async function fetchComments(bno: number, page = 1, size = 20) {
  const r = await http.get("/comment/read", { params: { bno, page, size } });
  return normalizeCommentPage(unwrap<any>(r));
}

/** 등록: POST JSON /comment/create */
export async function createComment(payload: CreateCommentReq) {
  const r = await http.post("/comment/create", payload, {
    headers: { "Content-Type": "application/json" },
  });
  return unwrap<any>(r);
}

/** 수정: POST JSON /comment/{cno}/update */
export async function updateComment(payload: UpdateCommentReq) {
  const { cno, ...rest } = payload;
  const r = await http.post(`/comment/${cno}/update`, rest, {
    headers: { "Content-Type": "application/json" },
  });
  return unwrap<any>(r);
}

/** 삭제: POST /comment/{cno}/delete */
export async function removeComment(cno: number) {
  const r = await http.post(`/comment/${cno}/delete`);
  return unwrap<any>(r);
}

/** 좋아요: POST /comment/{cno}/like */
const commentLikeLock = new Set<number>();

export async function likeComment(cno: number) {
  if (commentLikeLock.has(cno)) return; // 중복요청 차단
  commentLikeLock.add(cno);
  try {
    const token = getAccessToken();
    try {
      const r = await http.post(`/comment/${cno}/like`, undefined, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return unwrap<any>(r);
    } catch (e: any) {
   
      const msg = String(e?.message || "");
      //  본인 댓글 금지
      if (/본인\s*댓글.*좋아요.*누를 수 없습니다/.test(msg)) {
        throw new Error("본인 댓글에는 좋아요를 누를 수 없습니다.");
      }
      // 인증 이슈
      if (/401|unauthorized|인증|로그인/i.test(msg)) {
        throw new Error("로그인이 필요합니다.");
      }
      
      if (/이미|중복|duplicate/i.test(msg)) {
      
        return;
      }
      throw e;
    }
  } finally {
    commentLikeLock.delete(cno);
  }
}
