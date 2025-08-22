// src/features/board/data/comment.api.ts
import { http } from "@/shared/data/http";
import type {
  ApiResult,
  CreateCommReq, CreateCommRes,
  ReadCommReq, ReadCommRes,
  UpdateCommReq, UpdateCommRes,
  DeleteCommReq, DeleteCommRes,
} from "./comment.types";

const BASE = "/anpetna/comment";

/** ApiResult 래퍼를 벗겨주는 헬퍼 (선택) */
const unwrap = async <T>(p: Promise<{ data: ApiResult<T> }>) => {
  const { data } = await p;
  return data.result; // 백엔드 ApiResult<T>의 result 필드
};

export const commentApi = {
  /** 댓글 생성: POST /anpetna/comment/create  (body: CreateCommReq) */
  create: (body: CreateCommReq) =>
    unwrap<CreateCommRes>(http.post(`${BASE}/create`, body)),

  /** 댓글 목록: GET /anpetna/comment/read?bno=&page=&size=&sortBy= */
  read: (params: ReadCommReq) =>
    unwrap<ReadCommRes>(http.get(`${BASE}/read`, { params })),

  /** 댓글 수정: POST /anpetna/comment/{cno}/update  (body: UpdateCommReq) */
  update: (cno: number, body: Omit<UpdateCommReq, "cno">) =>
    unwrap<UpdateCommRes>(http.post(`${BASE}/${cno}/update`, { cno, ...body })),

  /** 댓글 좋아요: POST /anpetna/comment/{cno}/like  (body 없음) */
  like: (cno: number) =>
    unwrap<UpdateCommRes>(http.post(`${BASE}/${cno}/like`, {})),

  /** 댓글 삭제: POST /anpetna/comment/{cno}/delete  (body 없음) */
  remove: (cno: number) =>
    unwrap<DeleteCommRes>(http.post(`${BASE}/${cno}/delete`, {})),
};
