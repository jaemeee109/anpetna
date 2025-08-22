import { http } from "@/shared/data/http";
import type {
  CreateOrderReq, CreateOrderRes,
  OrdersDetailRes, OrdersListRes,
} from "./order.types";

/** ApiResult<T> 래퍼 */
type ApiResult<T> = {
  isSuccess: boolean;
  resCode: number;
  resMessage: string;
  result: T;
};
/** ApiResult<T> → T 언랩 */
const unwrap = async <T>(p: Promise<{ data: ApiResult<T> }>) => {
  const { data } = await p;
  return data.result;
};

const BASE = "/orders";

export const orderApi = {
  // 주문 생성
  create:        (body: CreateOrderReq)                 => unwrap<CreateOrderRes>(http.post(BASE, body)),

  // 주문 상세
  detail:        (ordersId: number)                     => unwrap<OrdersDetailRes>(http.get(`${BASE}/${ordersId}`)),

  // 특정 회원 주문 목록
  listByMemberId:(memberId: string, params?: { page?: number; size?: number }) =>
                   unwrap<OrdersListRes>(http.get(`${BASE}/member/${memberId}`, { params })),

  // 내 주문 목록
  listMe:        (params?: { page?: number; size?: number }) =>
                   unwrap<OrdersListRes>(http.get(`${BASE}/me`, { params })),

  // 주문 취소
  cancel:        (ordersId: number)                     => unwrap<void>(http.put(`${BASE}/${ordersId}/cancel`, {})),

  // 상태 변경(관리자)
  updateStatus:  (ordersId: number, status: string)     => unwrap<void>(http.patch(`${BASE}/${ordersId}/status`, { status })),

  // 요약(페이지네이션)
  summaryByMember:(memberId: string, params?: { page?: number; size?: number }) =>
                   unwrap<OrdersListRes>(http.get(`${BASE}/summary`, { params: { memberId, ...params } })),
};
