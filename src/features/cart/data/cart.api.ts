// src/features/cart/data/cart.api.ts
import http from '@/shared/data/http';
import type { CartDTO, CartItemDTO, AddCartReq, UpdateCartReq } from './cart.types';

/** 서버 응답 → 프론트 CartItemDTO로 안전 매핑 */
function toCartItemDTO(x: any): CartItemDTO {
  // 백엔드는 ItemDTO.thumbnails: string[] 과 quantity 를 루트에 실어 보냄
  // (thumbnails[0]가 대표 썸네일)  ← 백 코드 기준 :contentReference[oaicite:3]{index=3}
  const thumbs: string[] =
    Array.isArray(x?.thumbnails) ? x.thumbnails :
    Array.isArray(x?.item?.thumbnails) ? x.item.thumbnails :
    [];

  const firstThumb =
    (thumbs[0] as string | undefined) ??
    (x?.images?.[0]?.url as string | undefined) ??
    (x?.item?.images?.[0]?.url as string | undefined) ??
    (x?.thumbnailUrl as string | undefined) ??
    (x?.item?.thumbnailUrl as string | undefined) ??
    (x?.imageUrl as string | undefined) ??
    '';

    return {
     itemId: Number(x?.itemId ?? x?.item?.itemId ?? 0),
    name: String(x?.name ?? x?.itemName ?? x?.item?.itemName ?? ''),
    price: Number(x?.price ?? x?.itemPrice ?? x?.item?.itemPrice ?? 0),
    quantity: Number(x?.quantity ?? x?.item?.quantity ?? 1),
    imageUrl: firstThumb,

    // ✅ 백엔드가 cart 항목 PK를 어떤 키로 주든 안전하게 수용
    cartItemId:
      x?.cartItemId != null ? Number(x.cartItemId) :
      x?.id != null ? Number(x.id) :
      x?.cartId != null ? Number(x.cartId) :
      (x?.cartItem?.id != null ? Number(x.cartItem.id) : undefined),
  };
}

/** 장바구니 조회: ApiResult<T>의 result 언랩 */
async function me(): Promise<CartDTO> {
  // ✅ 백엔드 실제 prefix는 cart  (컨트롤러 @RequestMapping 확인) :contentReference[oaicite:5]{index=5}
  const resp = await http.get('/cart');
  const data = (resp as any)?.data ?? resp;
  const payload = data?.result ?? data ?? {};
  const rawList = payload?.items ?? payload?.list ?? [];
  const items: CartItemDTO[] = Array.isArray(rawList) ? rawList.map(toCartItemDTO) : [];
  return { ...(payload as object), items } as CartDTO;
}

/** 장바구니 담기 */
async function add(payload: AddCartReq) {
  return http.post('/cart', payload); // 경로 수정
}

/** 수량 변경 (cartItemId 또는 itemId 허용) */
async function update(payload: UpdateCartReq) {
  const id = 'itemId' in payload ? payload.itemId : payload.cartItemId;
  if (!id) throw new Error('수정할 항목 id가 없습니다.');
  return http.put(`/cart/${id}`, { quantity: payload.quantity }); // 경로 수정
}

/** 항목 삭제 (숫자 id = itemId/cartItemId 어느 쪽이든 허용) */
async function remove(id: number | { itemId?: number; cartItemId?: number }) {
  const rid = typeof id === 'number' ? id : id.itemId ?? id.cartItemId;
  if (!rid) throw new Error('삭제할 항목 id가 없습니다.');
  return http.delete(`/cart/${rid}`); // 경로 수정
}

export const cartApi = { me, add, update, remove };
export default cartApi;
