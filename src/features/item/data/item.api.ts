import { http } from "@/shared/data/http";
import type {
  ItemDTO,
  ItemListReq, ItemListRes,
  CreateItemReq, CreateItemRes,
  UpdateItemReq, UpdateItemRes,
} from "./item.types";

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

const BASE = "/items";

export const itemApi = {
  list:   (params: ItemListReq)             => unwrap<ItemListRes>(http.get(BASE, { params })),
  detail: (itemId: number)                  => unwrap<ItemDTO>(http.get(`${BASE}/${itemId}`)),

  create: (body: CreateItemReq)             => unwrap<CreateItemRes>(http.post(BASE, body)),
  update: (body: UpdateItemReq)             => unwrap<UpdateItemRes>(http.put(`${BASE}/${body.itemId}`, body)),
  remove: (itemId: number)                  => unwrap<void>(http.delete(`${BASE}/${itemId}`)),

  search: (q: string, page?: number, size?: number) =>
           unwrap<ItemListRes>(http.get(`${BASE}/search`, { params: { q, page, size } })),
};
