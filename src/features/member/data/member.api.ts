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
import { cacheMemberRole } from '@/features/member/utils/memberRole';

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

/** (호환용) ADMIN일 때만 쿠키/키 추가로 기록하는 유틸 — 삭제하지 않고 유지 */
function persistRoleAdminOnly(isAdmin: boolean) {
  try {
    if (isAdmin) {
      localStorage.setItem('memberRole', 'ADMIN'); // UI는 'ADMIN' 문자열을 신뢰
      setCookie('memberRole', 'ADMIN', 7);
    } else {
      // 기존 구현은 키를 삭제했지만, 이제는 로그인 로직에서 항상 USER/ADMIN을 먼저 기록하므로
      // 여기선 삭제하지 않는 편이 안전하다. (호출 자체를 하지 않거나, 아래 두 줄 그대로 둬도 무방)
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

/** 서버에서 역할 확인: me/info + /member/read{One}/{id} 모두 시도 (보강용) */
async function resolveRoleFromServer(memberId?: string|number): Promise<'ADMIN'|'USER'|null> {
  const mePaths = ['/member/me','/jwt/me','/auth/me','/member/info','/jwt/info','/auth/me'];
  const readById = (memberId ? [`/member/readOne/${memberId}`, `/member/read/${memberId}`] : []);
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

/** 🔹 본인 정보 조회: /member/me, /jwt/me, /auth/me 후보 */
export async function readMemberMe(): Promise<ReadMemberOneRes> {
  const meCandidates = ['/member/me', '/jwt/me', '/auth/me'];
  for (const b of bases()) {
    for (const p of meCandidates) {
      try {
        const d: any = await jsonFetch(`${b}${p}`, { method:'GET', credentials:'include', headers: authHeaders() });
        const res = (d?.result ?? d?.data ?? d ?? null) as ReadMemberOneRes | null;
        if (res) return res as ReadMemberOneRes;
      } catch {}
    }
  }
  throw new Error('본인 정보 조회 실패');
}

export async function readMemberOne(id: string): Promise<ReadMemberOneRes> {
  // id가 비어 있으면 me로 우회 -> 빈 /member/read/ 호출 방지
  if (!id || String(id).trim() === '') {
    return await readMemberMe();
  }
  const pathCandidates = [
    `/member/readOne/${encodeURIComponent(id)}`,
    `/member/read/${encodeURIComponent(id)}`,
  ];
  for (const b of bases()) {
    for (const p of pathCandidates) {
      try {
        const d: any = await jsonFetch(`${b}${p}`, { method:'GET', credentials:'include', headers:authHeaders() });
        return (d?.result ?? d ?? null) as ReadMemberOneRes;
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

/** ⭐ 로그인: 프론트에서 선(先) 확정 기록 → 서버 확인은 보강(실패해도 강등 금지) */
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

        // 2) 프론트 선(先) 판별: 응답필드/토큰/JWT/아이디로 ADMIN 추정
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
        if (!isAdmin && typeof mid !== 'undefined') {
          if (String(mid).toLowerCase() === 'master') isAdmin = true;
        }

        // 3) ✅ 선확정 기록(항상 기록) — 여기서 Application Storage에 즉시 보임
        try {
          const roleName = isAdmin ? 'ADMIN' : 'USER';
          localStorage.setItem('memberRole', roleName); // 문자열로 통일 ('ADMIN' | 'USER')
          if (roleName === 'ADMIN') setCookie('memberRole', 'ADMIN', 7);
          else deleteCookie('memberRole');
        } catch {}

        // 4) (선택) 서버 보강 — 실패해도 강등 금지
        try {
          const confirmed = await resolveRoleFromServer(mid);
          if (confirmed === 'ADMIN') {
            localStorage.setItem('memberRole', 'ADMIN');
            setCookie('memberRole', 'ADMIN', 7);
          }
        } catch {}

        // (참고) 과거 호환 유틸은 호출하지 않음: persistRoleAdminOnly(isAdmin);

        return data;
      } catch (e) { last = e; }
    }
  }
  throw last instanceof Error ? last : new Error('로그인 실패');
}
