// features/member/data/member.api.ts

// =======================================================
// 공용 member API 모듈 (프론트 요청 경로 단일화)
// - 로그인: /jwt/login (단일 엔드포인트 고정)
//   * 1차: credentials:"omit" (쿠키 미동반) → 2차: "include" 재시도
// - 기타 API: 인증이 필요할 수 있어 credentials:"include" 사용
// - BASE / PREFIX는 .env.local 로 덮어쓸 수 있음
//   NEXT_PUBLIC_API_BASE=http://192.168.0.160:8000
//   NEXT_PUBLIC_API_PREFIX=                ← 기본값 '' (빈 값; /anpetna 미사용)
// =======================================================

// ======== (로컬 타입 선언: import 없이 동작하도록 최소 정의) ========
export type MemberRole =
  | "USER" | "ADMIN"
  | "ROLE_USER" | "ROLE_ADMIN"
  | (string & {});

export interface MemberImage {
  uuid?: number | string;
  fileName?: string;
  url?: string;
  sortOrder?: number;
}

export interface Member {
  // 식별 / 인증
  memberId: string;
  memberPw?: string;

  // 기본 정보
  memberName: string;

  // 생년월일(YYYY/MM/DD + 양/음력)
  memberBirthY: string;
  memberBirthM: string;
  memberBirthD: string;
  memberBirthGM: string; // '양력' | '음력'

  // 기타 특성
  memberGender: string;   // 'M' | 'F' | 'U' 등
  memberHasPet: string;   // 'Y' | 'N'

  // 연락
  memberPhone: string;
  smsStsYn: string;       // 'Y' | 'N'
  memberEmail: string;
  emailStsYn: string;     // 'Y' | 'N'

  // 주소
  memberRoadAddress: string;
  memberZipCode: string;
  memberDetailAddress: string;

  // 권한/소셜/비고
  memberRole: MemberRole;
  memberSocial?: boolean;
  memberEtc?: string;

  // 프로필 이미지 (백엔드: List memberFileImage)
  images?: MemberImage[];
  memberFileImage?: Array<string | MemberImage>;

  // 생성/수정 시간 (BaseEntity)
  createDate?: string;
  latestDate?: string;

  // 서버가 다른 키로 줄 수도 있어 보조 키들
  social?: boolean;
  etc?: string;

  // 백엔드 MemberDTO에 보일 수 있는 보조 필드들(관대 처리)
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

  // 선택
  memberSocial?: boolean;
  memberEtc?: string;

  // 호환 키
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
  tokenType?: string; // e.g. 'Bearer'
  // 서버가 다른 키로 줄 수도 있어 대비
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

// ✅ 기본값을 ''(빈 값)으로. 실제로 /anpetna 컨텍스트를 쓰면 .env에 넣어 덮어써라.
const API_PREFIX = (process.env.NEXT_PUBLIC_API_PREFIX as string | undefined) || "";

/** 접두를 붙여 절대 URL 생성 */
function apiURL(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  // prefix가 ''이면 그냥 BASE + path
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

/** 토큰을 Authorization 헤더에 실어줌 (객체 형태로 반환) */
function authHeaderObject(): Record<string, string> {
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("accessToken") || null;
  }
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

/** 공통 POST (credentials: include) */
async function post<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const resp = await fetch(apiURL(path), {
    method: "POST",
    credentials: "include",
    headers: buildHeaders(init?.headers, true), // ← JSON 헤더 + 안전 병합
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
  remove: "/member/delete",        // GET (인증 필요)
  // 로그인은 아래 login()에서 /jwt/login 고정 사용
};

// =============== 로그인 ===============
export async function login(body: LoginReq): Promise<LoginRes> {
  const url = apiURL("/jwt/login");

  // 1) 쿠키 없이 먼저 (기존 잔여 쿠키로 인한 충돌 방지)
  let resp = await fetch(url, {
    method: "POST",
    credentials: "omit",
    headers: buildHeaders(undefined, true),
    body: JSON.stringify(body),
  });

  // 2) 서버가 쿠키 정책이면 include로 한 번 더
  if (!resp.ok) {
    try {
      resp = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: buildHeaders(undefined, true),
        body: JSON.stringify(body),
      });
    } catch {
      // ignore
    }
  }

  if (resp.ok) {
    return (await parseJson(resp)) as LoginRes;
  }

  const text = await resp.text().catch(() => "");
  throw new Error(`로그인 실패 (/jwt/login)\nHTTP ${resp.status}${text ? `\n${text}` : ""}`);
}

// =============== 회원 API ===============
export async function signup(body: JoinMemberReq): Promise<JoinMemberRes> {
  const data = await post<any>(ENDPOINTS.signup, body);
  // 서버 응답이 여러 형태일 수 있으니 관대하게 추출
  const memberId =
    data?.memberId ??
    data?.result?.memberId ??
    data?.dto?.memberId ??
    data?.id ??
    body.memberId;
  return { memberId };
}

export async function listMembers(): Promise<ReadMemberAllRes> {
  const data = await get<any>(ENDPOINTS.list);
  const arr = data?.dtoList ?? data?.list ?? data?.members ?? data ?? [];
  return Array.isArray(arr) ? (arr as ReadMemberAllRes) : [];
}

export async function readMemberOne(memberId: string): Promise<ReadMemberOneRes> {
  const data = await get<any>(ENDPOINTS.readOne(memberId));
  return data as ReadMemberOneRes;
}

export async function modifyMember(req: ModifyMemberReq): Promise<ModifyMemberRes> {
  const data = await post<any>(ENDPOINTS.modify, req);
  // 서버가 dto 를 래핑해서 줄 수도 있음
  const m = (data?.dto ?? data) as ModifyMemberRes;
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
