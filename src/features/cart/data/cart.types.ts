// src/features/cart/data/cart.types.ts

/** 장바구니 아이템 */
export type CartItemDTO = {
  itemId: number;          // 상품 PK
  name: string;            // 상품명
  price: number;           // 단가
  quantity: number;        // 수량
  imageUrl?: string;       // 썸네일 URL
  cartItemId?: number;     // 서버가 제공하면 사용(선택)
};

/** 장바구니 전체 */
export type CartDTO = {
  items: CartItemDTO[];
  // 필요한 추가 요약 필드가 있으면 여기에 확장(유지)
  [k: string]: any;
};

/** 추가(담기) 요청 */
export type AddCartReq = {
  itemId: number;
  quantity: number;
};

/**
 * 수량 변경 요청
 * - 서버가 /cart/{id} 형태를 사용하므로
 *   cartItemId 또는 itemId 둘 중 하나를 허용
 */
export type UpdateCartReq =
  | { cartItemId: number; quantity: number }
  | { itemId: number; quantity: number };
