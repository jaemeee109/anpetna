// src/shared/data/http.ts
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { withPrefix } from "@/lib/api";

function hasWindow() { return typeof window !== "undefined"; }
const ONE_MIN = 60 * 1000;

const BASE =
  (process.env.NEXT_PUBLIC_API_BASE as string | undefined)?.replace(/\/+$/, "") ||
  (hasWindow()
    ? `${window.location.protocol}//${window.location.hostname}${
        window.location.port
          ? `:${window.location.port === "3000" ? "8000" : window.location.port}`
          : ""
      }`.replace(/:$/, "")
    : "");

// baseURL에는 경로(prefix) 넣지 않음
const instance: AxiosInstance = axios.create({
  baseURL: BASE,
  withCredentials: true,
  timeout: 20 * ONE_MIN,
});

// ===== 토큰 유틸 =====
const stripBearer = (v?: string | null) => (v ? v.replace(/^Bearer\s+/i, "") : "");

function getCookie(name: string): string | null {
  if (!hasWindow()) return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function getAccessToken(): string | null {
  if (!hasWindow()) return null;
  const ls = localStorage.getItem("accessToken");
  if (ls) return stripBearer(ls);
  const fromAuth = getCookie("Authorization");
  if (fromAuth) return stripBearer(fromAuth);
  const fromAccess = getCookie("accessToken");
  if (fromAccess) return stripBearer(fromAccess);
  return null;
}

function getRefreshToken(): string | null {
  if (!hasWindow()) return null;
  const ls = localStorage.getItem("refreshToken");
  if (ls) return stripBearer(ls);
  const fromCookie =
    getCookie("refreshToken") || getCookie("RefreshToken") || getCookie("refresh_token");
  return stripBearer(fromCookie);
}

function setAccessToken(token: string) {
  if (!hasWindow()) return;
  const plain = stripBearer(token);
  localStorage.setItem("accessToken", plain);
  const maxAge = 60 * 60 * 12;
  document.cookie = `Authorization=Bearer ${plain}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function setRefreshToken(token?: string | null) {
  if (!hasWindow() || !token) return;
  const plain = stripBearer(token);
  localStorage.setItem("refreshToken", plain);
  const maxAge = 60 * 60 * 24 * 10;
  document.cookie = `refreshToken=${plain}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function clearTokens() {
  try {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    document.cookie = `Authorization=; Path=/; Max-Age=0; SameSite=Lax`;
    document.cookie = `refreshToken=; Path=/; Max-Age=0; SameSite=Lax`;
    if (hasWindow()) window.dispatchEvent(new Event("auth-changed"));
  } catch {}
}

// ===== 요청 인터셉터: Authorization 자동 부착 =====
instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    // Axios v1 헤더 객체(AxiosHeaders or object) 모두 대응
    const h = (config.headers ?? {}) as any;
    if (typeof h.set === "function") h.set("Authorization", `Bearer ${token}`);
    else (h["Authorization"] = `Bearer ${token}`);
    (config as any).headers = h;
  }
  return config;
});

// ===== 응답 인터셉터: 401 처리 =====
let refreshing = false;
let waiters: Array<() => void> = [];

async function doRefresh(): Promise<string> {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error("NO_REFRESH_TOKEN");

  const url = withPrefix("/jwt/refresh");
  const res = await axios.post(
    `${BASE}${url}`,
    { refreshToken: refresh },
    { withCredentials: true }
  );

  const d = res?.data ?? {};
  const access = stripBearer(
    d?.accessToken ?? d?.result?.accessToken ?? d?.dto?.accessToken ?? d?.token ?? d?.jwt
  );
  const newRefresh = stripBearer(
    d?.refreshToken ?? d?.result?.refreshToken ?? d?.dto?.refreshToken
  );

  if (!access) throw new Error("REFRESH_SUCCEEDED_BUT_NO_ACCESS");

  setAccessToken(access);
  if (newRefresh) setRefreshToken(newRefresh);
  return access;
}

function subscribeRefresh(waiter: () => void) { waiters.push(waiter); }
function notifyRefreshers() { waiters.forEach((w) => w()); waiters = []; }

instance.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const { config, response } = error;
    const original = config as AxiosRequestConfig & { _retried?: boolean; _publicRetry?: boolean };

    if (!response || response.status !== 401 || original._retried) {
      return Promise.reject(error);
    }

    const hadAuthHeader =
      !!(original.headers as any)?.Authorization || !!getAccessToken();
    const hasRefresh = !!getRefreshToken();

    // (A) refresh 없음 + Authorization 있었던 공개 API 401 → 토큰 폐기 후 1회 재시도
    if (!hasRefresh && hadAuthHeader && !original._publicRetry) {
      clearTokens();
      if (original.headers) delete (original.headers as any).Authorization;
      original._publicRetry = true;
      return instance.request(original);
    }

    // (B) refresh 있으면 갱신 시도
    if (hasRefresh) {
      if (refreshing) {
        await new Promise<void>((resolve) => subscribeRefresh(resolve));
        const token = getAccessToken();
        if (token && original.headers) {
          (original.headers as any).Authorization = `Bearer ${token}`;
        }
        original._retried = true;
        return instance.request(original);
      }

      try {
        refreshing = true;
        await doRefresh();
        notifyRefreshers();
        const token = getAccessToken();
        if (token && original.headers) {
          (original.headers as any).Authorization = `Bearer ${token}`;
        }
        original._retried = true;
        return instance.request(original);
      } catch {
        notifyRefreshers();
        clearTokens();
        return Promise.reject(error);
      } finally {
        refreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const http = instance;
export {
  setAccessToken,
  setRefreshToken,
  clearTokens,
  getAccessToken,   // 필요하면
  getRefreshToken,  // 필요하면
};