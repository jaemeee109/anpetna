// features/member/data/member.api.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  Member,
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

/** ADMIN일 때만 저장, 아니면 키 삭제(절대 USER로 덮어쓰지 않음) */
function persistRoleAdminOnly(isAdmin: boolean) {
  try {
    if (isAdmin) {
      localStorage.setItem('memberRole', 'ADMIN');
      setCookie('memberRole', 'ADMIN', 7);
    } else {
      localStorage.removeItem('memberRole');
      deleteCookie('memberRole');
    }
  } catch {}
}

/** API 베이스 후보 */
function bases(): string[] {
  return Array.from(new Set([
    (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/$/, ''),
    typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':8000') : '',
    typeof window !== 'undefined' ? window.location.origin : '',
  ].filter(Boolean)));
}

async function jsonFetch<T=any>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) throw new Error((data && (data.message||data.error)) || `HTTP ${r.status}`);
  return data as T;
}

/* ---------------- ADMIN 판별 유틸 ---------------- */
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
  if (Array.isArray(v)) return v.map(x => x && typeof x==='object' && 'authority' in x ? String((x as any).authority) : String(x));
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

/** 서버에서 역할 확인: me/info + /member/read/{id} 모두 시도 */
async function resolveRoleFromServer(memberId?: string|number): Promise<'ADMIN'|'USER'|null> {
  const mePaths = ['/jwt/info','/member/info','/auth/me','/api/auth/me','/anpetna/jwt/info','/anpetna/member/info','/anpetna/auth/me'];
  const readById = (memberId ? [`/member/read/${memberId}`, `/anpetna/member/read/${memberId}`] : []);
  for (const b of bases()) {
    for (const p of mePaths) {
      try {
        const d: any = await jsonFetch(`${b}${p}`, { method:'GET', credentials:'include', headers: authHeaders() });
        const src = d?.result ?? d?.data ?? d?.user ?? d?.member ?? d ?? {};
        const claimsLike = src?.claims ?? src?.tokenPayload ?? src;
        if (isAdminFromClaims(claimsLike)) return 'ADMIN';
        const serverField =
          src?.memberRole ?? src?.member_role ?? src?.role ?? src?.roles ?? src?.roleId ?? src?.role_id;
        if (String(serverField).toUpperCase().includes('ADMIN') || Number(serverField)===1) return 'ADMIN';
        return 'USER';
      } catch {}
    }
    for (const p of readById) {
      try {
        const d: any = await jsonFetch(`${b}${p}`, { method:'GET', credentials:'include', headers: authHeaders() });
        const src = d?.result ?? d ?? {};
        const v = src?.memberRole ?? src?.member_role ?? src?.role ?? src?.roles ?? src?.roleId ?? src?.role_id;
        if (String(v).toUpperCase().includes('ADMIN') || Number(v)===1) return 'ADMIN';
        return 'USER';
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

export async function readMemberOne(id: string): Promise<ReadMemberOneRes> {
  for (const b of bases()) {
    try {
      const d: any = await jsonFetch(`${b}/member/read/${id}`, { credentials:'include', headers:authHeaders() });
      return (d?.result ?? d ?? null) as ReadMemberOneRes;
    } catch {}
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

export async function removeMember(): Promise<{ok:true}> {
  for (const b of bases()) {
    try {
      await jsonFetch(`${b}/member/delete`, { method:'POST', credentials:'include', headers:authHeaders() });
      return { ok:true };
    } catch {}
  }
  throw new Error('회원 탈퇴 실패');
}

export async function signup(body: JoinMemberReq): Promise<JoinMemberRes> {
  const paths = ['/jwt/signup','/member/signup','/anpetna/jwt/signup'];
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

/** ⭐ 로그인: 여기서 바로 ADMIN 확정 → memberRole 저장 */
export async function login(body: LoginReq): Promise<LoginRes> {
  const paths = ['/jwt/login','/member/login','/api/auth/login','/anpetna/jwt/login'];
  let last: any;
  for (const b of bases()) {
    for (const p of paths) {
      try {
        const data = await jsonFetch<LoginRes>(`${b}${p}`, {
          method:'POST', credentials:'include',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify(body),
        });

        // 1) 토큰/아이디 저장
        const r: any = (data as any)?.result ?? (data as any);
        const access: string|undefined = r?.accessToken || r?.token || r?.access_token;
        const refresh: string|undefined = r?.refreshToken || r?.refresh_token;
        const mid: string|number|undefined = r?.memberId || r?.id || r?.username || r?.loginId;
        try {
          if (access) localStorage.setItem('accessToken', access);
          if (refresh) localStorage.setItem('refreshToken', refresh);
          if (mid !== undefined) localStorage.setItem('memberId', String(mid));
        } catch {}

        // 2) 1차 판별: 응답필드 + JWT
        let isAdmin =
          String(
            r?.memberRole ?? r?.member_role ?? r?.role ?? r?.roles ?? r?.roleId
          ).toUpperCase().includes('ADMIN') ||
          Number(r?.roleId) === 1 ||
          Number(r?.memberRole) === 1 ||
          Number(r?.member_role) === 1;

        if (!isAdmin && access) {
          const claims = parseJwt(access);
          isAdmin = isAdminFromClaims(claims);
        }

        // 3) 2차 판별: 서버 질의
        if (!isAdmin) {
          const role = await resolveRoleFromServer(mid);
          if (role === 'ADMIN') isAdmin = true;
        }

        // 4) 최후 안전장치: 아이디가 master면 ADMIN
        if (!isAdmin && typeof mid !== 'undefined') {
          if (String(mid).toLowerCase() === 'master') isAdmin = true;
        }

        // 5) 최종 저장 정책
        persistRoleAdminOnly(isAdmin);
        return data;
      } catch (e) { last = e; }
    }
  }
  throw last instanceof Error ? last : new Error('로그인 실패');
}
