// features/item/data/item.types.ts
export type ItemCategory =
  | 'FEED' | 'SNACKS' | 'CLOTHING'
  | 'BATH_PRODUCT' | 'BEUTY_PRODUCT'
  | 'TOY' | 'OTHERS';

export type ItemSellStatus = 'SELL' | 'SOLD_OUT';
export type ItemSaleStatus = 'ONSALE' | 'ORIGIN';

export type ImageDTO = {
  uuid: number;
  fileName: string;
  url: string;
  sortOrder: number;
};

export type ItemDTO = {
  itemId: number;
  itemName: string;
  itemPrice: number;
  itemStock: number;
  itemDetail: string;
  itemSellStatus: ItemSellStatus;
  itemSaleStatus: ItemSaleStatus;
  itemCategory: ItemCategory;
  images?: ImageDTO[];
};

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

// 목록 조회 파라미터
export type ItemListQuery = {
  category?: ItemCategory;
  q?: string;
  page?: number;   // 1-based
  size?: number;   // default 12
  sort?: string;   // "price,asc"
};
