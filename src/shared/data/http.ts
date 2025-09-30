// src/shared/data/http.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { purgeAuthArtifacts } from '@/features/member/data/session';

/** env helper (빈 문자열 방지) */
const env = (k: string, fallback = "") => {
  const v = process.env[k];
  if (typeof v !== "string") return fallback;
  const t = v.trim();
  return t.length ? t : fallback;
};

// 기본값: .env 비어 있어도 동작
const BASE = env("NEXT_PUBLIC_API_BASE_URL", "http://192.168.0.160:8000");
const PREFIX = env("NEXT_PUBLIC_API_PREFIX", "");

// 디버그
console.log("[HTTP] baseURL =", BASE || "(empty)", "prefix =", PREFIX || "(none)");

/** 안전한 base64 → utf8 디코딩 (브라우저/노드 모두 대응) */
function b64ToUtf8(b64: string): string {
  try {
    if (typeof window !== "undefined" && typeof window.atob === "function") {
      const ascii = window.atob(b64);
      try {
        return decodeURIComponent(escape(ascii));
      } catch {
        return ascii;
      }
    } else {
      // eslint-disable-next-line no-undef
      return Buffer.from(b64, "base64").toString("utf8");
    }
  } catch {
    return "";
  }
}

/** JWT payload 디코드 (검증X, 만료 체크용) */
function decodeJwt(token: string): null | { exp?: number } {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    const json = JSON.parse(b64ToUtf8(payload));
    return json;
  } catch {
    return null;
  }
}

function isExpiredJwt(token: string): boolean {
  const p = decodeJwt(token);
  if (!p?.exp) return false; // exp 없으면 만료 판단 안함
  const nowSec = Math.floor(Date.now() / 1000);
  return p.exp <= nowSec;
}

/** 쿠키 읽기 */
function getCookie(name: string): string {
  try {
    if (typeof document === "undefined") return "";
    const m = document.cookie.match(
      new RegExp("(?:^|;\\s*)" + name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "=([^;]+)")
    );
    return m ? decodeURIComponent(m[1]) : "";
  } catch {
    return "";
  }
}

/** 쿠키 제거(선택) */
function clearCookie(name: string) {
  try {
    if (typeof document === "undefined") return;
    document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; path=/`;
  } catch {}
}

/** 다양한 저장소(local/session/cookie)에서 토큰 획득 + 만료 시 정리 */
function pickRawTokenFromStores(): string | null {
  // 1) localStorage
  try {
    const l1 = localStorage.getItem("accessToken");
    const l2 = localStorage.getItem("Authorization");
    if (l1) return l1;
    if (l2) return l2;
  } catch {}

  // 2) sessionStorage
  try {
    const s1 = sessionStorage.getItem("accessToken");
    const s2 = sessionStorage.getItem("Authorization");
    if (s1) return s1;
    if (s2) return s2;
  } catch {}

  // 3) cookie (accessToken 쿠키)
  const c1 = getCookie("accessToken");
  if (c1) return c1;

  // 4) 기타 관용 키
  try {
    const l3 = localStorage.getItem("access_token");
    if (l3) return l3;
    const s3 = sessionStorage.getItem("access_token");
    if (s3) return s3;
  } catch {}

  return null;
}

/** local/session/cookie에서 토큰 얻기(만료면 정리 후 null 반환) */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  const raw0 = pickRawTokenFromStores();
  if (!raw0) return null;

  // 'Bearer xxx' 형태로 저장돼 있을 수도 있음
  const token = raw0.startsWith("Bearer ") ? raw0.slice(7) : raw0;

  // 만료면 제거하고 null
  if (isExpiredJwt(token)) {
    try {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("Authorization");
    } catch {}
    try {
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("Authorization");
    } catch {}
    clearCookie("accessToken");
    return null;
  }
  return token;
}

/** 토큰 저장/제거 도우미(선택) */
export function setAccessToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    const pure = token.startsWith("Bearer ") ? token.slice(7) : token;
    try {
      localStorage.setItem("accessToken", pure);
    } catch {}
  } else {
    try {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("Authorization");
    } catch {}
    try {
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("Authorization");
    } catch {}
    clearCookie("accessToken");
  }
}

/** Bearer 포맷 정규화 */
function toBearer(token: string) {
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

/** Axios 인스턴스 */
const instance: AxiosInstance = axios.create({
  baseURL: `${BASE}${PREFIX}`,
  withCredentials: true,
});



// 알림 1회만 표시
let __apnAuthAlertShown = false;

function redirectToLoginWithNext(message: string) {
  if (typeof window === 'undefined') return;

  if (!__apnAuthAlertShown) {
    __apnAuthAlertShown = true;
    window.alert(message);
  }

  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/member/login?next=${next}`;
}

// 응답 인터셉터
instance.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status ?? 0;
    if (status === 401 || status === 403) {
      // 현재 보유한 인증 흔적이 있는지로 "미로그인" vs "만료" 추정
      const hasToken = !!getAccessToken();
      const hasSession = !!getCookie('JSESSIONID');

      if (hasToken || hasSession) {
        // 만료/권한 소멸: 인증 흔적 정리 후 만료 안내
        try { purgeAuthArtifacts(); } catch {}
        redirectToLoginWithNext('로그인 기간이 만료되었습니다. 다시 로그인 해주세요');
      } else {
        // 최초 미로그인
        redirectToLoginWithNext('로그인 후 이용해주세요');
      }
    }
    return Promise.reject(error);
  }
);

/** 요청 인터셉터 */
instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.headers = (config.headers ?? {}) as any;
  const headers = config.headers as any;

  const skip = headers["X-Skip-Auth"] === "1";

  if (!skip) {
    if (!headers.Authorization) {
      const token = getAccessToken();
      if (token) headers.Authorization = toBearer(token);
    }
    // 인증 호출은 기본값 유지(withCredentials=true)
  } else {
    // ✅ 비인증 호출: 헤더/쿠키 모두 제거
    delete headers.Authorization;
    config.withCredentials = false;
  }

  return config;
});

const http = instance;
export { http };
export default http;
