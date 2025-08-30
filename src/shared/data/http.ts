// src/shared/data/http.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

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

/** localStorage에서 토큰 얻기(만료면 null 반환) */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  const raw =
    localStorage.getItem("accessToken") ??
    localStorage.getItem("Authorization") ??
    null;

  if (!raw) return null;

  // 'Bearer xxx' 형태로 저장돼 있을 수도 있음
  const token = raw.startsWith("Bearer ") ? raw.slice(7) : raw;

  // 만료면 제거하고 null
  if (isExpiredJwt(token)) {
    try {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("Authorization");
    } catch {}
    return null;
  }
  return token;
}

/** 토큰 저장/제거 도우미(선택) */
export function setAccessToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(
      "accessToken",
      token.startsWith("Bearer ") ? token.slice(7) : token
    );
  } else {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("Authorization");
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
    // 인증 호출은 기본값 유지
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
