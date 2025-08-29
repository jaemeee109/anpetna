// features/member/data/member.api.ts

// =======================================================
// 공용 member API 모듈 (프론트 요청 경로 단일화)
// - 로그인: /jwt/login
// - 기타 API: credentials:"include"
// - BASE / PREFIX는 .env.local 로 덮어쓸 수 있음
//   NEXT_PUBLIC_API_BASE=http://192.168.0.160:8000
//   NEXT_PUBLIC_API_PREFIX=
// =======================================================

// ======== (로컬 타입 선언: import 없이 동작하도록 최소 정의) ========
export type MemberRole =
  | 0 | 1 | 2
  | 'USER' | 'ADMIN' | 'BLACKLIST'
  | 'ROLE_USER' | 'ROLE_ADMIN' | 'ROLE_BLACKLIST'
  | (string & {});
export interface MemberImage {
  uuid?: number | string;
  fileName?: string;
  url?: string;
  sortOrder?: number;
}
export interface Member {
  memberId: string;
  memberPw?: string;
  memberName: string;
  memberBirthY: string;
  memberBirthM: string;
  memberBirthD: string;
  memberBirthGM: string; // '양력' | '음력'
  memberGender: string;   // 'M' | 'F' | 'U'
  memberHasPet: string;   // 'Y' | 'N'
  memberPhone: string;
  smsStsYn: string;
  memberEmail: string;
  emailStsYn: string;
  memberRoadAddress: string;
  memberZipCode: string;
  memberDetailAddress: string;
  memberRole: MemberRole;
  memberSocial?: boolean;
  memberEtc?: string;
  images?: MemberImage[];
  memberFileImage?: Array<string | MemberImage>;
  createDate?: string;
  latestDate?: string;
  social?: boolean;
  etc?: string;
  status?: string;
  memberDTO?: Member;
}
export type ReadMemberAllRes = Member[];
export interface ReadMemberOneRes extends Member {}

export interface JoinMemberReq {
  memberId: string;
  memberPw: string;
  memberName: string;
  memberBirthY: string;
  memberBirthM: string;
  memberBirthD: string;
  memberBirthGM: string;
  memberGender: string;
  memberHasPet: string;
  memberPhone: string;
  smsStsYn: string;
  memberEmail: string;
  emailStsYn: string;
  memberRoadAddress: string;
  memberZipCode: string;
  memberDetailAddress: string;
  memberRole: MemberRole;
  memberSocial?: boolean;
  memberEtc?: string;
  social?: boolean;
  etc?: string;
}
export type JoinMemberRes = { memberId: string };

export type ModifyMemberReq = Partial<Omit<Member, "memberId">> & { memberId: string };
export type ModifyMemberRes = Member;

export interface LoginReq {
  memberId: string;
  memberPw: string;
}
export interface LoginRes {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  token?: string;
  jwt?: string;
  memberId?: string;
}

// ----- 환경값 & 유틸 -----
const BASE =
  (process.env.NEXT_PUBLIC_API_BASE as string | undefined) ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}${
        window.location.port
          ? `:${window.location.port === "3000" ? "8000" : window.location.port}`
          : ""
      }`.replace(/:$/, "")
    : "");

const API_PREFIX = (process.env.NEXT_PUBLIC_API_PREFIX as string | undefined) || "";

/** 접두를 붙여 절대 URL 생성 */
function apiURL(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const prefixed = `${API_PREFIX}${normalized}`.replace(/\/{2,}/g, "/");
  return new URL(prefixed, BASE).toString();
}

/** 응답을 JSON으로 파싱(빈 응답도 허용) */
async function parseJson(resp: Response) {
  const text = await resp.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/** ===== 토큰 유틸(이 파일 독립 동작용) ===== */
const hasWindow = () => typeof window !== "undefined";
const stripBearer = (v?: string | null) => (v ? v.replace(/^Bearer\s+/i, "") : "");

function setAccessToken(token?: string | null) {
  if (!hasWindow() || !token) return;
  const plain = stripBearer(token);
  localStorage.setItem("accessToken", plain);
  const maxAge = 60 * 60 * 12; // 12h
  document.cookie = `Authorization=Bearer ${plain}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  window.dispatchEvent(new Event("auth-changed"));
}
function setRefreshToken(token?: string | null) {
  if (!hasWindow() || !token) return;
  const plain = stripBearer(token);
  localStorage.setItem("refreshToken", plain);
  const maxAge = 60 * 60 * 24 * 10; // 10d
  document.cookie = `refreshToken=${plain}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}
export function clearTokens() {
  if (!hasWindow()) return;
  try {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    document.cookie = `Authorization=; Path=/; Max-Age=0; SameSite=Lax`;
    document.cookie = `refreshToken=; Path=/; Max-Age=0; SameSite=Lax`;
    window.dispatchEvent(new Event("auth-changed"));
  } catch {}
}

/** 토큰을 Authorization 헤더에 실어줌 (객체 형태로 반환) */
function authHeaderObject(): Record<string, string> {
  let token: string | null = null;
  if (hasWindow()) token = localStorage.getItem("accessToken");
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/** Headers 병합 유틸 (HeadersInit 안전 병합) */
function buildHeaders(extra?: HeadersInit, withJson = false): Headers {
  const h = new Headers(authHeaderObject());
  if (withJson) h.set("Content-Type", "application/json");
  if (extra) new Headers(extra).forEach((v, k) => h.set(k, v));
  return h;
}

/** 공통 GET (credentials: include) */
async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(apiURL(path), {
    method: "GET",
    credentials: "include",
    headers: buildHeaders(init?.headers),
    ...init,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`${path} 실패 (HTTP ${resp.status})\n${text.slice(0, 300)}`);
  }
  const body = await parseJson(resp);
  return body as T;
}

/** 공통 POST (credentials: include, JSON 바디) */
async function post<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const resp = await fetch(apiURL(path), {
    method: "POST",
    credentials: "include",
    headers: buildHeaders(init?.headers, true),
    body: JSON.stringify(body ?? {}),
    ...init,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`${path} 실패 (HTTP ${resp.status})\n${text.slice(0, 300)}`);
  }
  const data = await parseJson(resp);
  return data as T;
}

// ----- 엔드포인트 매핑 -----
export const ENDPOINTS = {
  signup: "/member/join",          // POST
  list: "/member/readAll",         // GET
  readOne: (memberId: string) => `/member/my_page/${encodeURIComponent(memberId)}`, // GET
  modify: "/member/modify",        // POST
  remove: "/member/delete",        // GET
};

// =============== 로그인 (토큰 저장 포함) ===============
export async function login(body: LoginReq): Promise<LoginRes> {
  const url = apiURL("/jwt/login"); // 백엔드가 /jwt/login에서 토큰 발급 

  // 1) credentials: omit
  let resp = await fetch(url, {
    method: "POST",
    credentials: "omit",
    headers: buildHeaders(undefined, true),
    body: JSON.stringify(body),
  });

  // 2) 실패 시 include 재시도 (서버가 쿠키/세션 정책일 때)
  if (!resp.ok) {
    try {
      resp = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: buildHeaders(undefined, true),
        body: JSON.stringify(body),
      });
    } catch { /* ignore */ }
  }

  const data = resp.ok ? await parseJson(resp) : null;
  if (!resp.ok || !data) {
    const text = await resp.text().catch(() => "");
    throw new Error(`로그인 실패 (/jwt/login)\nHTTP ${resp.status}${text ? `\n${text}` : ""}`);
  }

  // ── 토큰 추출: 바디 우선, 없으면 헤더 ─────────────────────────
  const accessFromBody =
    (data as any)?.accessToken ??
    (data as any)?.result?.accessToken ??
    (data as any)?.dto?.accessToken ??
    (data as any)?.token ??
    (data as any)?.jwt ??
    null;

  const refreshFromBody =
    (data as any)?.refreshToken ??
    (data as any)?.result?.refreshToken ??
    (data as any)?.dto?.refreshToken ??
    null;

  // 헤더에서 Authorization 노출 시 (서버가 expose-headers: Authorization 설정)
  const authHeader = resp.headers.get("authorization") || resp.headers.get("Authorization");
  const accessFromHeader = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || null;

  // 저장: accessToken 필수, refresh 있으면 같이
  const access = accessFromBody || accessFromHeader;
  if (access) setAccessToken(access);
  if (refreshFromBody) setRefreshToken(refreshFromBody);

  // 호출부 호환을 위해 원본 응답 형태 반환
  return (data as LoginRes);
}

// =============== 회원 API ===============
export async function signup(body: JoinMemberReq): Promise<JoinMemberRes> {
  const data = await post<any>(ENDPOINTS.signup, body);
  const memberId =
    (data as any)?.memberId ??
    (data as any)?.result?.memberId ??
    (data as any)?.dto?.memberId ??
    (data as any)?.id ??
    body.memberId;
  return { memberId };
}

export async function listMembers(): Promise<ReadMemberAllRes> {
  const data = await get<any>(ENDPOINTS.list);
  const arr = (data as any)?.dtoList ?? (data as any)?.list ?? (data as any)?.members ?? data ?? [];
  return Array.isArray(arr) ? (arr as ReadMemberAllRes) : [];
}

export async function readMemberOne(memberId: string): Promise<ReadMemberOneRes> {
  const data = await get<any>(ENDPOINTS.readOne(memberId));
  return data as ReadMemberOneRes;
}

export async function modifyMember(req: ModifyMemberReq): Promise<ModifyMemberRes> {
  const data = await post<any>(ENDPOINTS.modify, req);
  const m = ((data as any)?.dto ?? data) as ModifyMemberRes;
  return m;
}

// ✅ 로컬 타입: DeleteMemberRes (member.types.ts에 없을 때를 대비)
type DeleteMemberRes = {
  memberId?: string;
  success?: boolean;
  message?: string;
};
export async function removeMember(): Promise<DeleteMemberRes> {
  const data = await get<any>(ENDPOINTS.remove);
  return data as DeleteMemberRes;
}
