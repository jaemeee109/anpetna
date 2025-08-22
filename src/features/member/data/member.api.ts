import { http } from "@/shared/data/http";
import type {
  LoginReq, LoginRes,
  SignupReq, SignupRes,
  ProfileRes, UpdateMeReq, UpdateMeRes,
  MemberDTO,
} from "./member.types";

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

const AUTH = "/auth";
const MEMBERS = "/members";

export const memberApi = {
  // ==== Auth ====
  login:   (body: LoginReq) => unwrap<LoginRes>(http.post(`${AUTH}/login`, body)),
  refresh: ()               => unwrap<LoginRes>(http.post(`${AUTH}/refresh`, {})),
  logout:  ()               => unwrap<void>(http.post(`${AUTH}/logout`, {})),

  // ==== Me ====
  me:       ()                          => unwrap<ProfileRes>(http.get(`${MEMBERS}/me`)),
  updateMe: (body: UpdateMeReq)         => unwrap<UpdateMeRes>(http.put(`${MEMBERS}/me`, body)),

  // ==== Sign-up ====
  signup:   (body: SignupReq)           => unwrap<SignupRes>(http.post(MEMBERS, body)),

  // ==== Admin (optional) ====
  list:   (params?: { page?: number; size?: number }) =>
           unwrap<{ members: MemberDTO[] }>(http.get(MEMBERS, { params })),
  remove: (memberId: string)            => unwrap<void>(http.delete(`${MEMBERS}/${memberId}`)),
};
