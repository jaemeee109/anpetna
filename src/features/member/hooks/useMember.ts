// features/member/hooks/useMember.ts
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ModifyMemberReq,
  ReadMemberAllRes,
  ReadMemberOneRes,
  JoinMemberReq,
  JoinMemberRes,
  LoginReq,
  LoginRes,
} from '../data/member.types';
import {
  listMembers,
  readMemberOne,
  modifyMember,
  signup as apiSignup,
  login as apiLogin,
  removeMember,
} from '../data/member.api';

/* ================== 공통 유틸 ================== */
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
  try {
    document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; path=/`;
  } catch {}
}

function getAccessToken(): string {
  try {
    const t =
      localStorage.getItem('accessToken') ||
      localStorage.getItem('access_token') ||
      '';
    return t || '';
  } catch {
    return '';
  }
}
function getMemberId(): string {
  try {
    return localStorage.getItem('memberId') || '';
  } catch {
    return '';
  }
}
function clearLocalAuth() {
  try {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('memberId');
    localStorage.removeItem('memberRole');
  } catch {}
  deleteCookie('memberRole');
}
function authHeaders(): HeadersInit {
  const t = getAccessToken();
  if (!t) return {};
  return { Authorization: t.startsWith('Bearer ') ? t : `Bearer ${t}` };
}

function parseJwt(token: string): any | null {
  try {
    const clean = token.replace(/^Bearer\s+/i, '');
    const [, body] = clean.split('.');
    if (!body) return null;
    const b64 = body.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 ? 4 - (b64.length % 4) : 0;
    const json = atob(b64 + '='.repeat(pad));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
function arrayify(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v))
    return v.map((x) =>
      x && typeof x === 'object' && 'authority' in x
        ? String((x as any).authority)
        : String(x)
    );
  if (typeof v === 'string') return v.split(/[,\s]+/).filter(Boolean);
  return [String(v)];
}
function isAdminFromClaims(claims: any): boolean {
  if (!claims) return false;

  const candidates = [
    claims.role,
    claims.roles,
    claims.authority,
    claims.authorities,
    claims.auth,
    claims.memberRole,
    claims.member_role,
    claims.scope,
    claims.scp,
  ];
  const all = candidates.flatMap(arrayify).map((s) => s.toUpperCase());

  const numericRaw =
    claims.memberRole ??
    claims.member_role ??
    claims.roleId ??
    claims.role_id ??
    claims.adminLevel;
  const numericAdmin = Number(numericRaw) === 1 || String(numericRaw) === '1';
  const booleanAdmin = !!(claims.isAdmin ?? claims.admin);

  return (
    numericAdmin ||
    booleanAdmin ||
    all.includes('ADMIN') ||
    all.includes('ROLE_ADMIN')
  );
}

/** ✅ ADMIN일 때만 저장. ADMIN이 아니면 키를 지움(절대 USER로 덮어쓰지 않음) */
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

/** 서버 베이스 후보들 */
function resolveBases(): string[] {
  const list = Array.from(
    new Set(
      [
        (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/$/, ''),
        typeof window !== 'undefined'
          ? window.location.origin.replace(':3000', ':8000')
          : '',
        typeof window !== 'undefined' ? window.location.origin : '',
      ].filter(Boolean)
    )
  );
  return list;
}

/** 로그인 후 서버에서 역할 재확인 (여러 경로 시도) */
async function fetchRoleFromServer(
  memberId?: string | number
): Promise<'ADMIN' | 'USER' | null> {
  const bases = resolveBases();
  const paths = [
    '/jwt/info',
    '/member/info',
    '/auth/me',
    '/api/auth/me',
    '/jwt/info',
    '/member/info',
    '/auth/me',
  ];

  const byId = [
    memberId ? `member/read/${memberId}` : '',
  ].filter(Boolean);

  for (const base of bases) {
    // 1) me/info 류
    for (const p of paths) {
      try {
        const url = `${base}${p}`;
        const r = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          headers: authHeaders(),
        });
        if (!r.ok) continue;
        const json: any = await r.json().catch(() => ({}));
        const src =
          json?.result ?? json?.data ?? json?.user ?? json?.member ?? json ?? {};
        const claimsLike = src?.claims ?? src?.tokenPayload ?? src;

        const isAdmin =
          isAdminFromClaims(claimsLike) ||
          String(
            src?.memberRole ?? src?.member_role ?? src?.role ?? src?.roles
          )
            .toUpperCase()
            .includes('ADMIN') ||
          Number(
            src?.roleId ??
              src?.role_id ??
              src?.memberRole ??
              src?.member_role ??
              -1
          ) === 1;

        return isAdmin ? 'ADMIN' : 'USER';
      } catch {
        /* try next */
      }
    }

    // 2) /member/read/{id} 류
    for (const p of byId) {
      try {
        const url = `${base}${p}`;
        const r = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          headers: authHeaders(),
        });
        if (!r.ok) continue;
        const json: any = await r.json().catch(() => ({}));
        const src = json?.result ?? json ?? {};
        const isAdmin =
          String(
            src?.memberRole ?? src?.member_role ?? src?.role ?? src?.roles
          )
            .toUpperCase()
            .includes('ADMIN') ||
          Number(
            src?.roleId ??
              src?.role_id ??
              src?.memberRole ??
              src?.member_role ??
              -1
          ) === 1;
        return isAdmin ? 'ADMIN' : 'USER';
      } catch {
        /* try next */
      }
    }
  }

  return null;
}

/* ================== 목록 훅 ================== */
export function useMemberList() {
  const [data, setData] = useState<ReadMemberAllRes>([]);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await listMembers();
        if (alive) setData(res);
      } catch (e) {
        if (alive) setErr(e as Error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { data, loading, error };
}

/* ================== 내 프로필 훅 ================== */
export function useMyProfile(initialId?: string) {
  const [member, setMember] = useState<ReadMemberOneRes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<Error | null>(null);

  const memberId = useMemo(() => initialId || getMemberId() || '', [initialId]);

  useEffect(() => {
    if (!memberId) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await readMemberOne(memberId);
        if (alive) setMember(res);
      } catch (e) {
        if (alive) setErr(e as Error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [memberId]);

  const update = useCallback(async (patch: ModifyMemberReq) => {
    const res = await modifyMember(patch);
    setMember(res);
    return res;
  }, []);

  const remove = useCallback(async () => {
    const res = await removeMember();
    clearLocalAuth();
    return res;
  }, []);

  return { member, loading, error, update, remove, memberId };
}

/* ================== 회원 액션(회원가입/로그인) ================== */
export function useMemberActions() {
  const signup = useCallback((body: JoinMemberReq): Promise<JoinMemberRes> => {
    return apiSignup(body);
  }, []);

  const login = useCallback(async (body: LoginReq): Promise<LoginRes> => {
    // 1) 로그인 호출
    const data = await apiLogin(body);

    // 2) 토큰/아이디 추출 & 저장 (여러 키 대응)
    const r: any = (data as any)?.result ?? data;
    const access: string | undefined =
      r?.accessToken || r?.token || r?.access_token;
    const refresh: string | undefined = r?.refreshToken || r?.refresh_token;
    const mid: string | number | undefined =
      r?.memberId || r?.id || r?.username || r?.loginId;

    try {
      if (access) localStorage.setItem('accessToken', access);
      if (refresh) localStorage.setItem('refreshToken', refresh);
      if (mid !== undefined) localStorage.setItem('memberId', String(mid));
    } catch {}

    // 3) 서버에 역할 확인 시도 (최우선, 실패하면 JWT/응답값으로 대체)
    let finalIsAdmin = false;

    try {
      const role = await fetchRoleFromServer(mid);
      if (role === 'ADMIN') finalIsAdmin = true;
      else if (role === 'USER') finalIsAdmin = false;
      else {
        // 서버가 역할 안 주면 JWT/응답 기반으로 판별
        const claims = access ? parseJwt(access) : null;
        const adminFromJwt = isAdminFromClaims(claims);

        const serverRoleRaw =
          r?.memberRole ??
          r?.member_role ??
          r?.role ??
          r?.roles ??
          r?.authorities ??
          r?.roleId ??
          r?.isAdmin ??
          r?.admin;

        const adminFromServerField =
          String(serverRoleRaw ?? '')
            .toUpperCase()
            .includes('ADMIN') ||
          Number(serverRoleRaw) === 1 ||
          (Array.isArray(serverRoleRaw) &&
            arrayify(serverRoleRaw).some((s) =>
              s.toUpperCase().includes('ADMIN')
            ));

        finalIsAdmin = !!(adminFromJwt || adminFromServerField);
      }
    } catch {
      // 네트워크 에러 등: JWT/응답 기반으로 최종판정
      const claims = access ? parseJwt(access) : null;
      const adminFromJwt = isAdminFromClaims(claims);

      const serverRoleRaw =
        r?.memberRole ??
        r?.member_role ??
        r?.role ??
        r?.roles ??
        r?.authorities ??
        r?.roleId ??
        r?.isAdmin ??
        r?.admin;

      const adminFromServerField =
        String(serverRoleRaw ?? '')
          .toUpperCase()
          .includes('ADMIN') ||
        Number(serverRoleRaw) === 1 ||
        (Array.isArray(serverRoleRaw) &&
          arrayify(serverRoleRaw).some((s) =>
            s.toUpperCase().includes('ADMIN')
          ));

      finalIsAdmin = !!(adminFromJwt || adminFromServerField);
    }

    // 4) 최종 저장 정책: ADMIN일 때만 저장, 아니면 지움
    persistRoleAdminOnly(finalIsAdmin);

    return data;
  }, []);

  return { signup, login };
}
