// src/shared/data/http.ts
/**   - Axios 전역 인스턴스(`http`) 생성 및 요청/응답 인터셉터 설정
 *   - AccessToken 자동 주입 및 만료 처리 + 401시 1회 자동 재발급
 *   - 401(인증 만료) 시 refresh 실패한 경우에만 자동 로그아웃/로그인 페이지로 이동
 *   - 환경변수(.env.local) 기반 baseURL 설정 */
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from "axios";
import { purgeAuthArtifacts } from '@/features/member/data/session';

/** ============== 환경변수 보조 함수 ============== */
const env = (k: string, fallback = "") => {
  const v = process.env[k];
  if (typeof v !== "string") return fallback;
  const t = v.trim();
  return t.length ? t : fallback;
};

// 기본값, .env 비어 있어도 동작
const BASE = env("NEXT_PUBLIC_API_BASE", process.env.NEXT_PUBLIC_API_BASE);
const PREFIX = env("NEXT_PUBLIC_API_PREFIX", "");

// [개발중] baseURL과  prefix를 콘솔로 확인
console.log("[HTTP] baseURL =", BASE || "(empty)", "prefix =", PREFIX || "(none)");

/** ============== JWT 유틸 함수 ============== */

// base64 -> utf8 문자열 반환
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
      return Buffer.from(b64, "base64").toString("utf8");
    }
  } catch {
    return "";
  }
}

// JWT payload (검증X, 만료 체크용)
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

// JWT 만료 여부 확인
function isExpiredJwt(token: string): boolean {
  const p = decodeJwt(token);
  if (!p?.exp) return false; // exp 없으면 만료 판단 안함
  const nowSec = Math.floor(Date.now() / 1000);
  return p.exp <= nowSec;
}

/** ============== 쿠키 / 로컬스토리지 접근 유틸 ============== */

// 쿠키 읽기
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

// 쿠키 삭제
function clearCookie(name: string) {
  try {
    if (typeof document === "undefined") return;
    document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; path=/`;
  } catch {}
}

/** ============== 저장소(Local/Session/Cookie)에서 토큰 탐색 ============== */

// local/session/cookie에서 access token 후보 찾기
function pickRawAccessFromStores(): string | null {
  try {
    const l1 = localStorage.getItem("accessToken");
    const l2 = localStorage.getItem("Authorization");
    if (l1) return l1;
    if (l2) return l2;
  } catch {}

  try {
    const s1 = sessionStorage.getItem("accessToken");
    const s2 = sessionStorage.getItem("Authorization");
    if (s1) return s1;
    if (s2) return s2;
  } catch {}

  const c1 = getCookie("accessToken");
  if (c1) return c1;

  try {
    const l3 = localStorage.getItem("access_token");
    if (l3) return l3;
    const s3 = sessionStorage.getItem("access_token");
    if (s3) return s3;
  } catch {}

  return null;
}

// refresh token 읽기/쓰기
function getRefreshToken(): string | null {
  try {
    return localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");
  } catch {
    return null;
  }
}
function setRefreshToken(token: string | null) {
  try {
    if (token) localStorage.setItem("refreshToken", token);
    else {
      localStorage.removeItem("refreshToken");
      sessionStorage.removeItem("refreshToken");
    }
  } catch {}
}

/** ============== 토큰 획득/ 저장/ 삭제 로직 ============== */

// AccessToken을 얻고, 만료 시 자동 삭제
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  const raw0 = pickRawAccessFromStores();
  if (!raw0) return null;

  // 'Bearer xxx' 형태로 저장된 경우 "xxx"만 추출
  const token = raw0.startsWith("Bearer ") ? raw0.slice(7) : raw0;

  // 만료면 제거하고 모든 저장소에서 삭제
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

// AccessToken 저장, 삭제
export function setAccessToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    const pure = token.startsWith("Bearer ") ? token.slice(7) : token;
    try {
      localStorage.setItem("accessToken", pure);
    } catch {}
  } else {
    // null이면 전체 초기화
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

/** Bearer 접두어를 강제로 붙여주는 함수 */
function toBearer(token: string) {
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

/** ============== Axios 인스턴스 생성 및 인터셉터 설정 ============== */

// Axios 전역 인스턴스 생성
const instance: AxiosInstance = axios.create({
  baseURL: `${BASE}${PREFIX}`,
  withCredentials: true, // 쿠키 포함
});

// 로그인 만료 알림 중복 방지
let __apnAuthAlertShown = false;

// 401 발생 시 로그인 페이지로 이동
function redirectToLoginWithNext(message: string) {
  if (typeof window === 'undefined') return;

  if (!__apnAuthAlertShown) {
    __apnAuthAlertShown = true;
    window.alert(message);
  }

  // 로그인 성공 후 돌아올 경로를 next 파라미터로 전달
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/member/login?next=${next}`;
}

/** ============== 내부 Refresh 호출 유틸 ============== */

// 동시 다발 401에 대한 중복 호출 방지
let refreshPromise: Promise<void> | null = null;

async function tryRefreshTokens(): Promise<void> {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error("NO_REFRESH_TOKEN");

  //  만료/포맷과 무관하게 “저장소의 원본” Access 토큰을 가져와 전송
  const raw = pickRawAccessFromStores(); // 'Bearer xxx' 혹은 'xxx'
  const accessForRefresh =
    raw ? (raw.startsWith("Bearer ") ? raw.slice(7) : raw) : null;

  try {
    const url = `${BASE}${PREFIX}/jwt/refresh`;
    const res = await axios.post(
      url,
      { refreshToken: refresh, accessToken: accessForRefresh },
      { withCredentials: true }
    );
    const r: any = (res.data?.result ?? res.data) || {};

    const newAccess: string | undefined = r.accessToken;
    const newRefresh: string | undefined = r.refreshToken;

    if (!newAccess) throw new Error("REFRESH_NO_ACCESS");

    setAccessToken(newAccess);
    if (newRefresh) setRefreshToken(newRefresh);
  } catch (e) {
    throw e instanceof Error ? e : new Error("REFRESH_FAILED");
  }
}

/** ============== 응답 인터셉터 ============== */

instance.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = (error?.response?.status ?? 0) as number;

    // 401 -> 재발급 시도 후 1회 재시도
    if (status === 401) {
      const original = error.config as InternalAxiosRequestConfig & { __retried?: boolean };

      // 재시도 무한루프 방지
      if (!original.__retried) {
        original.__retried = true;

        try {
          // 중복 호출 방지: 진행 중이면 해당 Promise 공유
          if (!refreshPromise) refreshPromise = tryRefreshTokens();
          await refreshPromise;
          refreshPromise = null;

          // 새 토큰으로 Authorization 갱신 후 원요청 재시도
          const t = getAccessToken();
          if (t) {
            original.headers = (original.headers ?? {}) as any;
            (original.headers as any).Authorization = toBearer(t);
          }
          return instance.request(original);
        } catch {
          refreshPromise = null;
          // 실패 시 아래 “로그아웃 처리”로 떨어져서 안내/리다이렉트
        }
      }

      // 여기로 오면: (a) refresh 토큰 없음, (b) refresh 실패, (c) 재시도도 401
      try { purgeAuthArtifacts(); } catch {}
      redirectToLoginWithNext('로그인 기간이 만료되었습니다. 다시 로그인 해주세요');
      return Promise.reject(error);
    }

    // 403은 세션 유지 (리다이렉트 X)

    // 에러 메시지를 표준화(normalizedMessage)로 추가
    const msg =
      (error?.response?.data as any)?.resMessage ||
      (error?.response?.data as any)?.message ||
      error?.message ||
      '오류가 발생했습니다.';
    (error as any).normalizedMessage = msg;

    return Promise.reject(error);
  }
);

/** ============== 요청 인터셉터 ============== */
instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.headers = (config.headers ?? {}) as any;
  const headers = config.headers as any;

  const skip = headers["X-Skip-Auth"] === "1"; // 인증 스킵 여부

  if (!skip) {
    // 인증 요청이라면 토큰 자동 주입
    if (!headers.Authorization) {
      const token = getAccessToken();
      if (token) headers.Authorization = toBearer(token);
    }
  } else {
    // 비인증 요청 -> 쿠키와, Authorization 제거
    delete headers.Authorization;
    config.withCredentials = false;
  }

  return config;
});

/** ============== http 인스턴스 및 에러 메세지 추출 함수 export ============== */

const http = instance;
export { http };
export default http;

// Axios 에러 객체에서 message를 안전하게 꺼내는 함수
export function pickHttpErrorMessage(e: any): string {
  return e?.normalizedMessage
      || e?.response?.data?.resMessage
      || e?.response?.data?.message
      || e?.message
      || '오류가 발생했습니다.';
}
