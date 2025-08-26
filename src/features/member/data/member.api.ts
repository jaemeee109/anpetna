// features/member/data/member.api.ts
import type {
  JoinMemberReq, JoinMemberRes,
  ModifyMemberReq, ModifyMemberRes,
  ReadMemberAllRes, ReadMemberOneRes,
  LoginReq, LoginRes,
  DeleteMemberRes,
} from './member.types';

// ----- 환경값 & 유틸 -----
const BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  (typeof window !== 'undefined' ? window.location.origin : '');

const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || ''; // 예: '/anpetna'
const LOGIN_PATH_CANDIDATES = [
  process.env.NEXT_PUBLIC_LOGIN_PATH || '/jwt/login',
  '/auth/login',
  '/member/login',
];

function apiURL(path: string) {
  // path 앞에 '/'가 없으면 보정
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(`${API_PREFIX}${normalized}`, BASE).toString();
}

type HeadersInitish = HeadersInit | Record<string, string>;

function isBrowser() {
  return typeof window !== 'undefined';
}

// 간단한 토큰 저장/조회 유틸
const tokenKey = 'accessToken';
const idKey = 'memberId';

export const AuthStore = {
  set(token?: string, memberId?: string) {
    if (!isBrowser()) return;
    if (token) localStorage.setItem(tokenKey, token);
    if (memberId) localStorage.setItem(idKey, memberId);
  },
  clear() {
    if (!isBrowser()) return;
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(idKey);
  },
  token() {
    return isBrowser() ? localStorage.getItem(tokenKey) || '' : '';
  },
  memberId() {
    return isBrowser() ? localStorage.getItem(idKey) || '' : '';
  },
};

function authHeaders(init?: HeadersInitish): HeadersInit {
  const t = AuthStore.token();
  return t
    ? { Authorization: `Bearer ${t}`, ...(init || {}) }
    : (init || {});
}

async function parseJson(resp: Response) {
  // 서버가 ApiResult<T> 형태거나 바로 T를 줄 수 있어 풀어줌
  const json = await resp.json().catch(() => ({}));
  return (json?.result ?? json?.data ?? json);
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(apiURL(path), {
    method: 'GET',
    credentials: 'include',
    headers: authHeaders(init?.headers),
    ...init,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`${path} 실패 (HTTP ${resp.status})\n${text.slice(0, 300)}`);
  }
  const body = await parseJson(resp);
  return body as T;
}

async function post<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const resp = await fetch(apiURL(path), {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders({ 'Content-Type': 'application/json', ...(init?.headers || {}) }),
    body: JSON.stringify(body ?? {}),
    ...init,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`${path} 실패 (HTTP ${resp.status})\n${text.slice(0, 300)}`);
  }
  const data = await parseJson(resp);
  return data as T;
}

// ----- 엔드포인트 매핑 -----
export const ENDPOINTS = {
  signup: '/member/join',                        // POST
  list: '/member/readAll',                       // GET
  readOne: (memberId: string) => `/member/my_page/${encodeURIComponent(memberId)}`, // GET
  modify: '/member/modify',                      // POST
  remove: '/member/delete',                      // GET (인증 필요)
};

// ----- API 함수들 -----
export async function signup(body: JoinMemberReq): Promise<JoinMemberRes> {
  // DTO 호환: social/etc가 들어오면 memberSocial/memberEtc로 보정
  const normalized = {
    ...body,
    memberSocial: body.memberSocial ?? body.social,
    memberEtc: body.memberEtc ?? body.etc,
  };
  const res = await post<JoinMemberRes>(ENDPOINTS.signup, normalized);
  return res;
}

export async function login(body: LoginReq): Promise<LoginRes> {
  // 여러 후보 경로를 시도
  let lastErr: unknown = null;
  for (const p of LOGIN_PATH_CANDIDATES) {
    try {
      const resp = await fetch(apiURL(p), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) continue;
      const data = await parseJson(resp) as any;

      const token: string | undefined =
        data?.accessToken ?? data?.token ?? data?.jwt ?? data?.result?.token;
      const mid: string | undefined =
        data?.memberId ?? body.memberId;

      if (token) AuthStore.set(token, mid);
      const out: LoginRes = {
        accessToken: data?.accessToken ?? token,
        refreshToken: data?.refreshToken,
        expiresIn: data?.expiresIn,
        tokenType: data?.tokenType ?? (token ? 'Bearer' : undefined),
        memberId: mid,
      };
      return out;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`로그인 실패: 가능한 경로(${LOGIN_PATH_CANDIDATES.join(', ')}) 모두 실패했습니다.${lastErr ? `\n${String(lastErr)}` : ''}`);
}

export async function listMembers(): Promise<ReadMemberAllRes> {
  const data = await get<any>(ENDPOINTS.list);
  // 서버가 리스트를 바로 주거나 result에 담아줄 수 있음
  const arr =
    data?.dtoList ?? data?.list ?? data?.members ?? data ?? [];
  return Array.isArray(arr) ? (arr as ReadMemberAllRes) : [];
}

export async function readMemberOne(memberId: string): Promise<ReadMemberOneRes> {
  const data = await get<any>(ENDPOINTS.readOne(memberId));
  return (data as ReadMemberOneRes);
}

export async function modifyMember(body: ModifyMemberReq): Promise<ModifyMemberRes> {
  // DTO 호환 보정
  const normalized = {
    ...body,
    memberSocial: body.memberSocial ?? (body as any).social,
    memberEtc: body.memberEtc ?? (body as any).etc,
  };
  const data = await post<any>(ENDPOINTS.modify, normalized);
  return (data as ModifyMemberRes);
}

export async function removeMember(): Promise<DeleteMemberRes> {
  const data = await get<any>(ENDPOINTS.remove);
  return data as DeleteMemberRes;
}
