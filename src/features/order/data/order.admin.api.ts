// src/features/order/data/order.admin.api.ts
import http from '@/shared/data/http';
import { ORDER } from '@/lib/api';

/** 백엔드 표준 엔드포인트 루트 */
const BASE = 'order';

/** 백엔드 상태 Enum (백엔드와 철자 100% 일치) */
export type OrdersStatus =
  | 'PENDING'           // 주문완료
  | 'PAID'              // 결제완료
  | 'SHIPMENT_READY'    // 배송준비중
  | 'SHIPPED'           // 배송출발
  | 'DELIVERED'         // 배송완료
  | 'CANCELLED'         // 주문취소
  | 'REFUNDED'          // 환불완료
  | 'CONFIRMATION';     // 구매확정

/** ERP(관리자) 목록 라인 (백엔드 /order/admin/erp 응답의 단건 라인에 맞춘 최소 타입) */
export type ErpLine = {
  ordersId: number;
  memberId?: string;
  createdAt?: string;
  itemQuantity: number;     // 총 수량
  itemsSubtotal: number;    // 상품합계 (가격 x 수량 합)
  shippingFee: number;      // 배송비
  totalAmount: number;      // 총 결제금액 (상품합계 + 배송비)
  status: OrdersStatus;     // 주문현황
  thumbnailUrl?: string;    // 대표 썸네일(있으면)
};

/** 페이지 응답 최소 타입 */
export type ErpPage = {
  content: ErpLine[];
  totalPages: number;
  totalElements: number;
  pageNumber?: number;
  pageSize?: number;
};

/** 관리자용 ERP 리스트: 기간/상태/회원ID/정렬/페이지 지원 */
export async function listErp(params: {
  from?: string;
  to?: string;
  status?: OrdersStatus | '';
  memberId?: string;
  page?: number;
  size?: number;
  sort?: 'statusAsc' | 'statusDesc';
}): Promise<ErpPage> {
  const qs = new URLSearchParams();
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.status) qs.set('status', String(params.status));   // ← 빈값이면 미전송
  if (params.memberId) qs.set('memberId', params.memberId.trim());
  if (params.page) qs.set('page', String(Math.max(0, params.page - 1))); // Spring 0-base
  if (params.size) qs.set('size', String(params.size));

  // 정렬: 상태 오름/내림만 허용 (요청사항 2와 일치)
  if (params.sort === 'statusAsc') qs.append('sort', 'status,ASC');
  if (params.sort === 'statusDesc') qs.append('sort', 'status,DESC');

  const resp = await http.get(`/order/admin/erp?${qs.toString()}`);
  const data = (resp as any)?.data ?? resp;
  return (data?.result ?? data) as ErpPage;
}


/** 관리자 권한으로 상태 변경 (최종 저장 시 호출) */
export async function adminChangeStatus(ordersId: number, next: OrdersStatus, reason?: string) {
  const q = new URLSearchParams();
  q.set('next', next);
  if (reason) q.set('reason', reason);
  return http.post(`${BASE}/admin/${encodeURIComponent(String(ordersId))}/status?${q.toString()}`);
}

/** (옵션) 단건 상세: 상품명/가격/수량 표시에 필요할 때 사용
 *  - 기존 사용자용 상세 엔드포인트(/order/{ordersId})를 그대로 호출
 */
export async function readOne(ordersId: number): Promise<any> {
  const res: any = await http.get(`${BASE}/${encodeURIComponent(String(ordersId))}`);
  return res?.data?.result ?? res?.data ?? res;
}

/** 한글 라벨 매핑 (화면 표기 전용) */
export const STATUS_LABEL: Record<OrdersStatus, string> = {
  PENDING: '주문완료',
  PAID: '결제완료',
  SHIPMENT_READY: '배송준비중',
  SHIPPED: '배송출발',
  DELIVERED: '배송완료',
  CANCELLED: '주문취소',
  REFUNDED: '환불완료',
  CONFIRMATION: '구매확정',
};
