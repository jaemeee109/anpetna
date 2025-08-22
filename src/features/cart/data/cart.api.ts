import { http } from "@/shared/data/http";
import type {
  CartDTO, CartItemDTO,
  AddCartReq, AddCartRes,
  UpdateCartReq, UpdateCartRes,
} from "./cart.types";

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

const BASE = "/cart";

export const cartApi = {
  // 담기
  add:    (body: AddCartReq)               => unwrap<AddCartRes>(http.post(BASE, body)),

  // 내 장바구니 조회
  me:     ()                                => unwrap<CartDTO>(http.get(BASE)),

  // 수량 변경
  update: (body: UpdateCartReq)             => unwrap<UpdateCartRes>(http.put(`${BASE}/${body.cartItemId}`, body)),

  // 아이템 제거
  remove: (cartItemId: number)              => unwrap<CartDTO>(http.delete(`${BASE}/${cartItemId}`)),

  // 전체 비우기
  clear:  ()                                => unwrap<CartDTO>(http.delete(BASE)),
};
