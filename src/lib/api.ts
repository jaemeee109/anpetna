// src/lib/api.ts

// ===== BASE / PREFIX =====
export const BASE =
  (process.env.NEXT_PUBLIC_API_BASE as string | undefined) ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}${
        window.location.port
          ? `:${window.location.port === '3000' ? '8000' : window.location.port}`
          : ''
      }`.replace(/:$/, '')
    : '');

export const API_PREFIX =
  (process.env.NEXT_PUBLIC_API_PREFIX as string | undefined) ?? '/anpetna';

export function apiURL(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(`${API_PREFIX}${normalized}`, BASE).toString();
}

// ===== 쿠키 읽기 =====
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = document.cookie.match(new RegExp('(?:^|; )' + safe + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

// ===== 토큰 읽기 (Bearer 제거해서 순수 토큰만 반환) =====
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const ls = window.localStorage;

  let raw =
    ls.getItem('accessToken') ||
    ls.getItem('access_token') ||
    ls.getItem('token') ||
    ls.getItem('jwt') ||
    ls.getItem('Authorization') || // 저장돼 있다면 "Bearer ..."일 수 있음
    getCookie('Authorization') ||
    getCookie('accessToken') ||
    null;

  if (!raw) return null;
  raw = raw.trim();
  return raw.startsWith('Bearer ') ? raw.slice(7).trim() : raw;
}

// ===== Authorization 헤더 생성 =====
export function buildAuthHeaders(base?: HeadersInit): HeadersInit {
  const token = getAccessToken();
  const h = new Headers(base || {});
  if (token && !h.has('Authorization')) {
    h.set('Authorization', `Bearer ${token}`);
  }
  return h;
}

// ===== fetch 래퍼: 항상 Authorization 붙이고 credentials 포함 =====
export async function authFetch(input: string, init?: RequestInit): Promise<Response> {
  const headers = buildAuthHeaders(init?.headers);
  return fetch(input, { ...init, credentials: 'include', headers });
}
