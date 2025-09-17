// src/features/order/data/order.api.ts
import http from '@/shared/data/http';
import { withPrefix, ORDER } from '@/lib/api';
import type { OrdersListRes, OrdersSummary, OrdersDetail } from './order.types';

/** 백엔드 표준 엔드포인트 */
const BASE = ORDER.ROOT;

/** 주문 생성: 요청 바디 (기존 호출부 호환) */
export type CreateOrderBody = {
  memberId: string;
  cardId: string;
  useSavedAddress: boolean;
  shippingAddress: { zipcode: string; street: string; detail: string; receiver: string; phone: string };
  items: { itemId: number; quantity: number }[];
  shippingFee?: number;
};

export type CreateOrderRes = { ordersId: number };

/** 공통: ApiResult 래핑 해제 + 주문번호 검증 */
function unwrapCreate(res: any): CreateOrderRes {
  const data = res?.data?.result ?? res?.data ?? res;
  const id = data?.ordersId;
  if (typeof id !== 'number') {
    const msg = res?.data?.resMessage || res?.resMessage || '주문번호를 받지 못했습니다.';
    throw new Error(msg);
  }
  return { ordersId: id };
}

/**
 * ✅ createOrder (호출부 호환 유지)
 * - 기존 바디(CreateOrderBody)를 그대로 받되, /order/buy 규격에 맞게 내부에서 mode와 itemId/itemIds를 주입해서 보냄.
 * - 단품(아이템 1개)이면 mode=ITEM + itemId/quantity
 * - 복수(장바구니 등)면 mode=CART + itemIds
 * - 기타 필드(memberId/cardId/주소/배송비)는 바디에 남아도 백엔드가 무시/허용하므로 그대로 전달
 *   (백엔드 /buy는 Authentication에서 memberId를 쓰고, cardId는 MANUAL로 세팅) :contentReference[oaicite:2]{index=2}
 */
export async function createOrder(body: CreateOrderBody): Promise<CreateOrderRes> {
  // mode 자동 주입
  const payload: any = { ...body };
  if (Array.isArray(body.items) && body.items.length > 1) {
    payload.mode = 'CART';
    payload.itemIds = body.items.map((it) => it.itemId);
  } else if (Array.isArray(body.items) && body.items.length === 1) {
    payload.mode = 'ITEM';
    payload.itemId = body.items[0].itemId;
    payload.quantity = Math.max(1, body.items[0].quantity ?? 1);
  } else {
    throw new Error('items가 비어 있습니다.');
  }

  // /order/buy 로 전송 (백엔드에서 ApiResult<CreateOrderRes> 반환)
  const res = await http.post(`${BASE}/buy`, payload);
  return unwrapCreate(res);
}

/** (직접 호출용) 단일 상품 즉시구매 */
export async function buyItem(itemId: number, quantity = 1): Promise<CreateOrderRes> {
  const res = await http.post(`${BASE}/buy`, { mode: 'ITEM', itemId, quantity });
  return unwrapCreate(res);
}

/** (직접 호출용) 장바구니 결제 */
export async function buyCart(itemIds: number[]): Promise<CreateOrderRes> {
  const res = await http.post(`${BASE}/buy`, { mode: 'CART', itemIds });
  return unwrapCreate(res);
}

/** 회원별 주문 요약: GET /order/members/{memberId}?page=&size= */
async function summaryByMember(
  memberId: string,
  opts?: { page?: number; size?: number; sort?: string }
): Promise<OrdersListRes> {
  // ✅ 서버는 0-base 페이지 → 그대로 0-base로 전달
  const page0 = Math.max(0, Number(opts?.page ?? 0));
  const size = Math.max(1, Number(opts?.size ?? 10));
  const sort = String(opts?.sort ?? 'ordersId,desc');

  const { data } = await http.get(`${BASE}/members/${encodeURIComponent(memberId)}`, {
    params: { page: page0, size, sort },
  });
  return (data?.result ?? data) as OrdersListRes;
}


/** 주문 상세: GET /order/{ordersId} */
async function detail(ordersId: number): Promise<OrdersSummary> {
  const { data } = await http.get(`${BASE}/${ordersId}`);
  // 컨트롤러는 ReadOneOrdersRes를 그대로 200 OK로 반환함 (ApiResult 아님) :contentReference[oaicite:4]{index=4}
  return (data?.result ?? data) as OrdersSummary;
}

/** 상태 변경: PATCH /order/{ordersId}/status?next=PAID|... */
async function changeStatus(ordersId: number, next: string) {
  const { data } = await http.patch(`${BASE}/${ordersId}/status`, null, { params: { next } });
  // 컨트롤러는 ReadOneOrdersRes 200 OK 반환 :contentReference[oaicite:5]{index=5}
  return data?.result ?? data;
}

/** 주소 수정: PATCH /order/{ordersId}/address */
// (교체) 주소 수정: PATCH /order/{ordersId}/address
async function updateAddress(
  ordersId: number,
  address: { zipcode: string; street: string; detail: string; receiver: string; phone?: string } // phone 허용
) {
  const { data } = await http.patch(`${BASE}/${ordersId}/address`, address);
  return data?.result ?? data;
}


/** (선택) 삭제: DELETE /order/{ordersId}
 *  ─ 백엔드 삭제 엔드포인트는 현재 주석처리되어 있어 404가 날 수 있습니다. (컨트롤러 주석 참고) :contentReference[oaicite:6]{index=6}
 */
async function remove(ordersId: number): Promise<{ ok: true }> {
  await http.delete(`${BASE}/${ordersId}`);
  return { ok: true };
}

/** 기본 export: 기존 호출부들이 쓰던 메서드 묶음 그대로 유지 */
const orderApi = { summaryByMember, detail, changeStatus, updateAddress, remove };
export default orderApi;
