// 서버 Enum과 맞춤
export type BoardType = 'NOTICE' | 'FAQ' | 'FREE' | 'QNA' | 'REVIEW' | 'EVENT';

// 서버 BoardDTO와 동일(목록/상세 공용으로 씀)
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
  createDate: string;  // LocalDateTime -> JSON 문자열
  latestDate: string;
  imageUrls: string[];
};

// 생성/수정 요청
export type CreateBoardReq = {
  bWriter: string;
  bTitle: string;
  bContent: string;
  boardType: BoardType;
  noticeFlag?: boolean;
  isSecret?: boolean;
  faqCategory?: string; // ★ 서버 DTO에 추가한 필드와 동일
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

// (요청 파라미터는 자유롭게 쓰되, list()에서는 page/size/type/keyword만 사용)
export type PageReq = { page?: number; size?: number; sort?: string };
