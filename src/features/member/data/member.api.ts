//src/features/member/data/member.api.ts

import http from '@/shared/data/http';
import { purgeAuthArtifacts } from '@/features/member/data/session';


import type {
  ReadMemberAllRes,
  ReadMemberOneRes,
  ModifyMemberReq,
  JoinMemberReq,
  JoinMemberRes,
  LoginReq,
  LoginRes,
} from './member.types';

/* ---------------- 공통 유틸 ---------------- */
function setCookie(name: string, value: string, days = 7) {
  try {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
      value
    )}; path=/; expires=${d.toUTCString()}`;
  } catch {}
}
function deleteCookie(name: string) {
  try { document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; path=/`; } catch {}
}
function getCookie(name: string): string {
  try {
    const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = document.cookie.match(new RegExp('(?:^|; )' + safe + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  } catch { return ''; }
}
function getAccessToken(): string {
  try {
    return (
      localStorage.getItem('accessToken') ||
      localStorage.getItem('access_token') ||
      ''
    );
  } catch { return ''; }
}
function authHeaders(): HeadersInit {
  const t = getAccessToken();
  return t ? { Authorization: t.startsWith('Bearer ') ? t : `Bearer ${t}` } : {};
}

/** API 베이스 후보 (백엔드 우선, 프론트는 맨 마지막) */
function bases(): string[] {
  const list = [
    (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/$/, ''),
    (typeof window !== 'undefined'
      ? window.location.origin.replace(':3000', ':8000')
      : ''
    ).replace(/\/$/, ''),
    // 프론트(3000)는 마지막 후보로 남겨 404 스팸을 줄인다.
    (typeof window !== 'undefined' ? window.location.origin : '').replace(/\/$/, ''),
  ].filter(Boolean);
  return Array.from(new Set(list));
}

async function jsonFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      ...(init?.headers || {}),
    },
    credentials: 'include',
  });

  const ct = r.headers.get('content-type') || '';
  const isJson = /application\/json/i.test(ct);
  const isHtml = /text\/html/i.test(ct);

  // 본문은 먼저 텍스트로
  const text = await r.text();

  // JSON 파싱(가능할 때만)
  let data: any = null;
  if (isJson && text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }

  const isLoginApi = /\/jwt\/login(?:\b|$)/.test(url);

  if (!r.ok) {
    // ✅ 로그인 실패는 상태코드가 무엇이든(400/401/404/500 등) 동일하게 처리
    if (isLoginApi) {
      alert('아이디/비밀번호를 잘못 입력하셨습니다. 다시 입력해주세요');
      // 화면에는 아무 HTML/에러본문도 노출하지 않도록 고정된 코드만 throw
      throw new Error('INVALID_CREDENTIALS');
    }

    // ✅ 일반 오류: HTML 본문을 화면에 흘리지 않도록 안전 메시지로만 throw
    const msg =
      (isJson && data && (data.message || data.error)) ||
      `HTTP ${r.status}`;
    throw new Error(String(msg));
  }

  // ✅ 정상인데 HTML이 오면(예: 프록시/라우팅 오류) 화면 노출 방지
  if (isHtml) {
    // 필요 시 콘솔로만 일부 확인
    console.warn('[jsonFetch] Unexpected HTML response for', url);
    throw new Error('UNEXPECTED_HTML');
  }

  // 정상 JSON이면 data, 그 외에는 undefined 반환(기존 로직 유지)
  return (isJson ? (data as T) : (undefined as unknown as T));
}



/* ---------------- JWT 디코드 보조 ---------------- */
function parseJwt(token: string): any | null {
  try {
    const clean = token.replace(/^Bearer\s+/i, '');
    const [, body] = clean.split('.');
    if (!body) return null;
    const b64 = body.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 ? 4 - (b64.length % 4) : 0;
    const json = atob(b64 + '='.repeat(pad));
    return JSON.parse(json);
  } catch { return null; }
}
function arrayify(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(x => (x && typeof x==='object' && 'authority' in x ? String((x as any).authority) : String(x)));
  if (typeof v === 'string') return v.split(/[,\s]+/).filter(Boolean);
  return [String(v)];
}
function isAdminFromClaims(claims: any): boolean {
  if (!claims) return false;
  const cs = [
    claims.role, claims.roles, claims.authority, claims.authorities,
    claims.auth, claims.memberRole, claims.member_role, claims.scope, claims.scp,
  ];
  const all = cs.flatMap(arrayify).map(s => s.toUpperCase());
  const numeric = claims.memberRole ?? claims.member_role ?? claims.roleId ?? claims.role_id ?? claims.adminLevel;
  const numericAdmin = Number(numeric) === 1 || String(numeric) === '1';
  const booleanAdmin = !!(claims.isAdmin ?? claims.admin);
  return numericAdmin || booleanAdmin || all.includes('ADMIN') || all.includes('ROLE_ADMIN');
}

/** 서버에서 역할 확인(있으면) */
async function resolveRoleFromServer(memberId?: string): Promise<string | null> {
  const id =
    memberId ||
    (typeof window !== 'undefined' && (localStorage.getItem('memberId') || localStorage.getItem('loginId'))) ||
    '';

  if (!id) return null;

  const candidates = [
    `/member/my_page/${encodeURIComponent(id)}`,       // USER 접근 가능
    `/member/readOne/${encodeURIComponent(id)}`,      // (백엔드 허용 시 보조)
  ];

  // 토큰/세션 없으면 시도하지 않음 → 401 스팸 방지
  const hasAuth = !!getAccessToken() || !!getCookie('JSESSIONID');
  if (!hasAuth) return null;

  for (const b of bases()) {
    for (const p of candidates) {
      try {
        const d: any = await jsonFetch(`${b}${p}`, { method: 'GET', credentials: 'include', headers: authHeaders() });
        const role =
          d?.result?.memberRole ??
          d?.data?.memberRole ??
          d?.member?.memberRole ??
          d?.memberRole ?? null;
        if (role) return String(role);
      } catch {}
    }
  }
  return null;
}

/* ---------------- 회원 API ---------------- */
export async function listMembers(): Promise<ReadMemberAllRes> {
  for (const b of bases()) {
    try {
      const d: any = await jsonFetch(`${b}/member/readAll`, { credentials:'include', headers:authHeaders() });
      return (d?.result ?? d ?? []) as ReadMemberAllRes;
    } catch {}
  }
  return [] as ReadMemberAllRes;
}

/** 🔹 본인 정보 조회 — 토큰/세션 없으면 호출 안 함 */
export async function readMemberMe(): Promise<any> {
  const id =
    (typeof window !== 'undefined' && (localStorage.getItem('memberId') || localStorage.getItem('loginId'))) || '';
  if (!id) throw new Error('로그인 후 시도하세요');

  // 토큰이나 세션쿠키가 전혀 없으면 서버 호출하지 않음
  const hasAuth = !!getAccessToken() || !!getCookie('JSESSIONID');
  if (!hasAuth) throw new Error('인증 정보 없음');

  const pathCandidates = [
    `/member/my_page/${encodeURIComponent(id)}`,   //  USER 접근 가능 엔드포인트
    `/member/readOne/${encodeURIComponent(id)}`,  // (백엔드 허용 시 보조)
  ];

  for (const b of bases()) {
    for (const p of pathCandidates) {
      try {
        const d: any = await jsonFetch(`${b}${p}`, {
          method: 'GET',
          credentials: 'include',
          headers: authHeaders(),
        });
        const res = d?.result ?? d?.data ?? d?.item ?? d?.member ?? d ?? null;
        if (res) return res;
      } catch {}
    }
  }
  throw new Error('본인 정보 조회 실패');
}

export async function readMemberOne(id: string): Promise<any> {
  const baseList = bases();
  const pathCandidates = [
    `/member/readOne/${encodeURIComponent(id)}`,
    `/member/my_page/${encodeURIComponent(id)}`,
  ];
  for (const b of baseList) {
    for (const p of pathCandidates) {
      try {
        const d: any = await jsonFetch(`${b}${p}`, {
          method: 'GET',
          credentials: 'include',
          headers: authHeaders(),
        });
        const res = d?.result ?? d?.data ?? d?.item ?? d?.member ?? d ?? null;
        if (res) return res;
      } catch {}
    }
  }
  throw new Error('회원 정보 조회 실패');
}

export async function modifyMember(body: ModifyMemberReq): Promise<ReadMemberOneRes> {
  for (const b of bases()) {
    try {
      const d: any = await jsonFetch(`${b}/member/update`, {
        method:'POST', credentials:'include',
        headers:{ 'Content-Type':'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      });
      return (d?.result ?? d ?? null) as ReadMemberOneRes;
    } catch {}
  }
  throw new Error('회원 수정 실패');
}

export async function removeMember(): Promise<void> {
  // 백엔드는 GET /member/delete 사용
  await http.get('/member/delete');
  // 로컬 인증 흔적 제거
  purgeAuthArtifacts();
}

export async function signup(body: JoinMemberReq): Promise<JoinMemberRes> {
  const paths = ['/jwt/signup','/member/signup','/jwt/signup'];
  for (const b of bases()) {
    for (const p of paths) {
      try {
        return await jsonFetch<JoinMemberRes>(`${b}${p}`, {
          method:'POST', credentials:'include',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify(body),
        });
      } catch {}
    }
  }
  throw new Error('회원가입 실패');
}

/** 로그인 */
export async function login(body: LoginReq): Promise<LoginRes> {
  const paths = ['/jwt/login'];
  let last: any;
  for (const b of bases()) {
    for (const p of paths) {
      try {
        const data = await jsonFetch<LoginRes>(`${b}${p}`, {
          method:'POST', credentials:'include',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify(body),
        });

        const r: any = (data as any)?.result ?? (data as any);
        const access: string|undefined = r?.accessToken || r?.token || r?.access_token;
        const refresh: string|undefined = r?.refreshToken || r?.refresh_token;
        const mid: string|number|undefined = r?.memberId || r?.id || r?.username || r?.loginId;

        try {
          if (access) localStorage.setItem('accessToken', access);
          if (refresh) localStorage.setItem('refreshToken', refresh);
          if (mid !== undefined) localStorage.setItem('memberId', String(mid));
        } catch {}

        // 프론트 선판정(로그인 응답 기반) — 상세 ADMIN 판정은 화면에서 추가 실행
        try {
          const claims = access ? parseJwt(access) : null;
          const isAdmin = isAdminFromClaims(claims);
          localStorage.setItem('memberRole', isAdmin ? 'ADMIN' : 'USER');
        } catch {}

        return data;
      } catch (e) { last = e; }
    }
  }
    if (last instanceof Error) {
    // 로그인 실패 케이스는 alert로 이미 안내했으므로 화면에는 문구를 남기지 않음
    if (last.message === 'INVALID_CREDENTIALS') {
      throw new Error(''); // 화면에 표시될 메시지 비움
    }
    throw last;
  }
  throw new Error('로그인 실패');
}

