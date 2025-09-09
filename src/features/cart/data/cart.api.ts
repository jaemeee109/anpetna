// src/features/cart/data/cart.api.ts
import http from '@/shared/data/http';
import type { CartDTO, CartItemDTO, AddCartReq, UpdateCartReq } from './cart.types';

/** 서버 응답 → 프론트 CartItemDTO로 안전 매핑 */
function toCartItemDTO(x: any): CartItemDTO {
  return {
    itemId: Number(x?.itemId ?? x?.item?.itemId ?? 0),
    name: String(x?.name ?? x?.itemName ?? x?.item?.itemName ?? ''),
    price: Number(x?.price ?? x?.itemPrice ?? x?.item?.itemPrice ?? 0),
    quantity: Number(x?.quantity ?? x?.item?.quantity ?? 1),
    imageUrl: String(x?.imageUrl ?? x?.thumbnailUrl ?? x?.item?.thumbnailUrl ?? ''),
    cartItemId: x?.cartItemId != null ? Number(x.cartItemId) : undefined,
  };
}

/** 장바구니 조회: ApiResult<T>의 result를 언랩 */
async function me(): Promise<CartDTO> {
  const resp = await http.get('/cart');
  const data = (resp as any)?.data ?? resp;
  const payload = data?.result ?? data ?? {};

  // 서버가 items 또는 list로 내려와도 대응
  const rawList = payload?.items ?? payload?.list ?? [];
  const items: CartItemDTO[] = Array.isArray(rawList) ? rawList.map(toCartItemDTO) : [];

  return { ...(payload as object), items } as CartDTO;
}

/** 장바구니 담기 */
async function add(payload: AddCartReq) {
  return http.post('/cart', payload);
}

/** 수량 변경 (cartItemId 또는 itemId 허용) */
async function update(payload: UpdateCartReq) {
  const id = 'itemId' in payload ? payload.itemId : payload.cartItemId;
  if (!id) throw new Error('수정할 항목 id가 없습니다.');
  return http.put(`/cart/${id}`, { quantity: payload.quantity });
}

/** 항목 삭제 (숫자 id = itemId/cartItemId 어느 쪽이든 허용) */
async function remove(id: number | { itemId?: number; cartItemId?: number }) {
  const rid = typeof id === 'number' ? id : id.itemId ?? id.cartItemId;
  if (!rid) throw new Error('삭제할 항목 id가 없습니다.');
  return http.delete(`/cart/${rid}`);
}

export const cartApi = { me, add, update, remove };
export default cartApi;
