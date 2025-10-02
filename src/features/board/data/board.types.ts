// src/features/board/data/board.types.ts
// 서버 Enum과 맞춤
export type BoardType = 'NOTICE' | 'FAQ' | 'FREE' | 'QNA' | 'REVIEW' | 'EVENT';

// 서버 BoardDTO와 동일(목록/상세 공용)
export type BoardDetail = {
  bno: number;
  bTitle: string;
  bContent: string;
  bViewCount: number;
  bLikeCount: number;
  bWriter: string;
  boardType: BoardType;
  noticeFlag: boolean;
  isSecret: boolean;
  createDate: string;   // LocalDateTime -> 문자열
  latestDate: string;
  imageUrls: string[];
};

// 생성/수정 요청 DTO
export type CreateBoardReq = {
  bWriter: string;
  bTitle: string;
  bContent: string;
  boardType: BoardType;
  noticeFlag?: boolean;
  isSecret?: boolean;
  category?: string;
  imageUrls?: string[];
};

export type UpdateBoardReq = Partial<CreateBoardReq> & { bno: number };

// 서버 PageResponseDTO<T>에 맞춘 응답 타입
export type PageRes<T> = {
  page: number;
  size: number;
  total: number;
  start: number;
  end: number;
  prev: boolean;
  next: boolean;
  dtoList: T[];
};
