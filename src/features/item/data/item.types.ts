// src/features/item/data/item.types.ts

/** 백엔드 enum과 정합성 유지 */
export type ItemCategory =
  | 'ALL'
  | 'FEED'
  | 'SNACKS'
  | 'CLOTHING'
  | 'BATH_PRODUCT'
  | 'BEUTY_PRODUCT' // 백엔드 오타 그대로 사용
  | 'TOY'
  | 'OTHERS';

export type ItemSellStatus = 'SELL' | 'SOLD_OUT';

/** 목록 조회 쿼리 (프론트 → 백 파라미터로 변환됨) */
export type ItemListQuery = {
  category?: ItemCategory;               // itemCategory
  q?: string;                            // keyword
  sort?: 'date,asc'|'date,desc'|'price,asc'|'price,desc'|'sales,asc'|'sales,desc';
  page?: number;                         // 1-base로 사용(프론트)
  size?: number;
  excludeSoldOut?: boolean;              // true면 itemSellStatus=SELL 전송
};

/** 아이템 DTO (백 필드 우선, 기존 프론트 방어 필드 포함) */
export type ItemDTO = {
  itemId: number;
  itemName: string;
  itemPrice: number;
  itemSellStatus?: ItemSellStatus;
  thumbnailUrl?: string;

  // 하위 호환/방어용(다른 화면에서 섞여 들어오는 필드 대비)
  id?: number;
  name?: string;
  title?: string;
  salePrice?: number;
  amount?: number;
  imageUrl?: string;
  thumbnail?: string;
  images?: { url?: string }[];

  itemDetail?: string;
  itemStock?: number;
  itemCategory?: ItemCategory;
  createDate?: string;
};

/** 페이지 응답 규격(이 프로젝트는 dtoList 기반) */
export type PageRes<T> = {
  dtoList: T[];
  total: number;
  page: number;
  size: number;
  start?: number;
  end?: number;
};
