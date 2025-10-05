// src/lib/api.ts
/** API 경로 유틸 + 상수*/

/** 공통  Prefix */
export const API_PREFIX = ((process.env.NEXT_PUBLIC_API_PREFIX as string | undefined) ?? "")
  .replace(/\/+$/, "");


/** 전달 받은 경로 p앞에 공통 prifix (필요 할 때만 붙임)*/
export function withPrefix(p: string): string {
  const path = p.startsWith("/") ? p : `/${p}`;
  if (!API_PREFIX) return path;
  // 이미 prefix 들어있으면 그대로 사용
  if (path === API_PREFIX || path.startsWith(`${API_PREFIX}/`)) return path;
  return `${API_PREFIX}${path}`.replace(/\/{2,}/g, "/");
}

/** 인증, 회원, 게시판, 댓글 등 고정 경로 모음 */
export const ENDPOINT = {
  LOGIN: (process.env.NEXT_PUBLIC_LOGIN_PATH as string | undefined) ?? "/jwt/login",
  REFRESH: withPrefix("/jwt/refresh"),
  ME: withPrefix((process.env.NEXT_PUBLIC_ME_PATH as string | undefined) ?? "/member/readOne"),
  MY_PAGE_PREFIX: withPrefix(
    (process.env.NEXT_PUBLIC_MY_PAGE_PREFIX as string | undefined) ?? "/member/my_page"
  ),
  BOARD: {
    READ_ALL: withPrefix("/board/readAll"),
    BASE: withPrefix("/board"),
  },
  COMMENT: {
    BASE: withPrefix("/comment"),
  },
} as const;

/** 주문 관련 동적, 정적 경로 모음 */
export const ORDER = {
  ROOT: withPrefix('/order'),
  BY_MEMBER: (memberId: string) => withPrefix(`/order/members/${memberId}`),
  DETAIL: (ordersId: number) => withPrefix(`/order/${ordersId}`),
  STATUS: (ordersId: number) => withPrefix(`/order/${ordersId}/status`),
};

