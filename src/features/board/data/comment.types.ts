// src/features/board/data/comment.types.ts

/** 백엔드 ApiResult<T> 래퍼 */
export type ApiResult<T> = {
  isSuccess: boolean;
  resCode: number;
  resMessage: string;
  result: T;
};

/** 백엔드 PageResponseDTO<E>와 매칭 */
export type PageResponseDTO<E> = {
  page: number;      // 현재 페이지
  size: number;      // 페이지당 개수
  total: number;     // 총 개수
  start?: number;    // 화면 시작 페이지 번호
  end?: number;      // 화면 끝 페이지 번호
  prev?: boolean;    // 이전 페이지 존재
  next?: boolean;    // 다음 페이지 존재
  dtoList: E[];      // 실 데이터
};

/** 댓글 단일 DTO (백엔드 CommentDTO) */
export type CommentDTO = {
  cno: number;
  bno: number | null;     // board FK
  cWriter: string;
  cContent: string;
  cLikeCount: number;
};

/** 생성 요청/응답 (CreateCommReq/Res) */
// 백엔드에서 create 시 bno 필수 확인함
export type CreateCommReq = {
  bno: number;
  cWriter: string;
  cContent: string;
  cLikeCount?: number; // 기본 0 처리 가능
};
export type CreateCommRes = {
  createComm: CommentDTO;
};

/** 목록 조회 요청/응답 (ReadCommReq/Res) */
export type ReadCommReq = {
  bno: number;
  page?: number;     // 기본 1
  size?: number;     // 기본 10
  sortBy?: string;   // 기본 "cno"
};
export type ReadCommRes = {
  bno: number;
  page: PageResponseDTO<CommentDTO>;
};

/** 수정 요청/응답 (UpdateCommReq/Res) */
export type UpdateCommReq = {
  cno: number;               // path param 로도 전달되지만 body에도 들어감
  cWriter?: string;
  cContent?: string;
  cLikeCount?: number;
};
export type UpdateCommRes = {
  updateComment: CommentDTO;
};

/** 삭제 요청/응답 (DeleteCommReq/Res) */
export type DeleteCommReq = {
  cno: number; // 실제 컨트롤러는 path param로 받고 body 없이 처리
};
export type DeleteCommRes = {
  deleteComment: CommentDTO;
};
