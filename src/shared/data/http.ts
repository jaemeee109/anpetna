// src/shared/data/http.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosRequestHeaders } from "axios";

/** 환경변수 읽기 (빈 문자열 방지) */
const env = (k: string, fallback = "") => {
  const v = process.env[k];
  if (typeof v !== "string") return fallback;
  const t = v.trim();
  return t.length ? t : fallback;
};

const BASE = env("NEXT_PUBLIC_API_BASE_URL", "http://192.168.0.160:8000");
const PREFIX = env("NEXT_PUBLIC_API_PREFIX", "");

console.log("[HTTP] baseURL =", BASE || "(empty)", "prefix =", PREFIX || "(none)");

/** 안전한 토큰 접근 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("Authorization") ||
    null
  );
}

export function setAccessToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("accessToken", token);
  } else {
    localStorage.removeItem("accessToken");
  }
}

/** Axios 인스턴스 */
const instance: AxiosInstance = axios.create({
  baseURL: `${BASE}${PREFIX}`,
  withCredentials: true,
});

// 요청 인터셉터
instance.interceptors.request.use((config) => {
  // headers 타입 보강
  const headers = (config.headers ?? {}) as AxiosRequestHeaders;

  if (!("Authorization" in headers)) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  config.headers = headers;
  return config;
});

const http = instance;
export { http };
export default http;
