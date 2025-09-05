// src/lib/api.ts
/**
 * API 경로 유틸 + 상수
 * - 백엔드가 루트(/) 또는 /anpetna 아래여도 withPrefix()가 알아서 붙임
 */

export const API_PREFIX = ((process.env.NEXT_PUBLIC_API_PREFIX as string | undefined) ?? "")
  .replace(/\/+$/, "");

export function withPrefix(p: string): string {
  const path = p.startsWith("/") ? p : `/${p}`;
  if (!API_PREFIX) return path;
  // 이미 prefix 들어있으면 그대로 사용
  if (path === API_PREFIX || path.startsWith(`${API_PREFIX}/`)) return path;
  return `${API_PREFIX}${path}`.replace(/\/{2,}/g, "/");
}

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
