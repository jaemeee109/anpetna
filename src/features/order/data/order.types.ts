// src/features/order/data/order.types.ts
export type OrdersSummary = {
  ordersId: number;
  memberId: string;
  totalAmount: number;
  cardId?: string;
  itemImageUrl?: string;
  itemImageName?: string;
  // 백 응답 필드 여유분
  [k: string]: any;
};

export type OrdersListRes = {
  content: OrdersSummary[];
  totalElements: number;
  totalPages: number;
  number: number;  // 현재 페이지(0-base일 수 있어 프론트에서 +1 처리 권장)
  size: number;
};

export type OrderItemView = {
  itemId: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
};

export type CheckoutFromQuery =
  | { mode: 'item'; itemId: number; quantity: number }
  | { mode: 'cart'; itemIds: number[] };
