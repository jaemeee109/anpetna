// src/features/order/data/order.api.ts
import http from '@/shared/data/http';
import { withPrefix } from '@/lib/api';
import type { OrdersListRes, OrdersSummary } from './order.types';

const BASE = withPrefix('/order'); // 백엔드 컨트롤러 base에 맞춤

/** 회원별 주문 요약 페이지 조회: GET /order/members/{memberId}?page=&size= */
async function summaryByMember(memberId: string, opts?: { page?: number; size?: number }): Promise<OrdersListRes> {
  const page = Math.max(1, opts?.page ?? 1);
  const size = Math.max(1, opts?.size ?? 10);
  const { data } = await http.get(`${BASE}/members/${encodeURIComponent(memberId)}`, { params: { page, size } });
  const result = data?.result ?? data;
  return (result ?? data) as OrdersListRes;
}

/** 상세: GET /order/{ordersId} */
async function detail(ordersId: number): Promise<OrdersSummary> {
  const { data } = await http.get(`${BASE}/${ordersId}`);
  const result = data?.result ?? data;
  return (result ?? data) as OrdersSummary;
}

/** 삭제(취소 대용): DELETE /order/{ordersId} — 백엔드에 맞춰 제공 */
async function remove(ordersId: number): Promise<{ ok: true }> {
  await http.delete(`${BASE}/${ordersId}`);
  return { ok: true };
}

export const orderApi = { summaryByMember, detail, remove };
export default orderApi;

// 주문 생성(결제 플로우)
export type CreateOrderReq =
  | { mode: 'ITEM'; itemId: number; quantity: number }
  | { mode: 'CART'; itemIds: number[] };

export type CreateOrderRes = { ordersId: number };

export async function createOrder(body: CreateOrderReq): Promise<CreateOrderRes> {
  const res = await http.post(withPrefix('/order/buy'), body);
  const d = res?.data;
  return (d?.result ?? d) as CreateOrderRes;
}
