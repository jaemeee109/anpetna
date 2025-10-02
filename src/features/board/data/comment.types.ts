//src/features/board/board/data/comments/types.ts
// 댓글 타입 (백엔드 응답의 키가 조금 달라도 안전하게 사용할 수 있게 최소 필드만 정의)
export type CommentItem = {
  cno: number;
  cWriter?: string;
  cContent?: string;
  cLikeCount?: number;
  createDate?: string;
  // 그 외 필드는 있어도 무방
};

export type PageRes<T> = {
  dtoList: T[];
  total: number;
  page: number;
  size: number;
  start?: number;
  end?: number;
};

export type CreateCommentReq = {
  bno: number;
 // cWriter: string;
  cContent: string;
};

export type UpdateCommentReq = {
  cno: number;
  cContent: string;
};

export type CommentDetail = {
  cno: number;
  bno: number;
  cWriter: string;
  cContent: string;
  cLikeCount?: number;
  createDate?: string;
  // 백엔드 키 변형 대응
  cwriter?: string;
  ccontent?: string;
  clikeCount?: number;
};

