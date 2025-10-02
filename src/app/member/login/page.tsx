// src/app/member/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login, readMemberMe } from '@/features/member/data/member.api';
import { purgeAuthArtifacts } from '@/features/member/data/session';


import PawIcon from '@/components/icons/Paw';

/* ---------- 역할 판별 유틸(로직만 추가, UI 비변경) ---------- */
type JwtPayload = {
  role?: string | string[];
  roles?: string[];
  authorities?: string[] | string;
  auth?: string;
  memberRole?: string;
  exp?: number;
  [k: string]: any;
};
function decodeJwt(token?: string): JwtPayload | null {
  if (!token) return null;
  try {
    const t = token.startsWith('Bearer ') ? token.slice(7) : token;
    const [, payload] = t.split('.');
    if (!payload) return null;
    const json = JSON.parse(
      decodeURIComponent(escape(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))))
    );
    return json;
  } catch { return null; }
}
function toUpperArray(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).toUpperCase());
  return String(v).toUpperCase().split(',').map((x) => x.trim()).filter(Boolean);
}
function pickRoleFromBag(bag: string[]): 'ADMIN' | 'BLACKLIST' | 'USER' | null {
  if (bag.some((s) => s.includes('ROLE_ADMIN') || s === 'ADMIN')) return 'ADMIN';
  if (bag.some((s) => s.includes('BLACKLIST') || s === 'ROLE_BLACKLIST')) return 'BLACKLIST';
  if (bag.length > 0) return 'USER';
  return null;
}
function roleFromJwt(tok?: string): 'ADMIN' | 'BLACKLIST' | 'USER' | null {
  const p = decodeJwt(tok);
  if (!p) return null;
  const bag: string[] = [];
  bag.push(...toUpperArray(p.role));
  bag.push(...toUpperArray(p.roles));
  bag.push(...toUpperArray(p.authorities));
  bag.push(...toUpperArray(p.auth));
  bag.push(...toUpperArray(p.memberRole));
  return pickRoleFromBag(bag);
}
function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = document.cookie.match(new RegExp('(?:^|; )' + safe + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
/** 서버에서 최종 역할 확인 (ADMIN/BLACKLIST/USER) — 토큰 있을 때만 */
async function roleFromServer(): Promise<'ADMIN' | 'BLACKLIST' | 'USER' | null> {
  const tok =
    (typeof window !== 'undefined' && (localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken'))) ||
    getCookie('Authorization') || '';
  if (!tok) return null; // 토큰 없으면 서버 조회하지 않음 → 401 스팸 방지

  try {
    const me: any = await readMemberMe();
    const raw =
      me?.result?.memberRole ??
      me?.data?.memberRole ??
      me?.member?.memberRole ??
      me?.memberRole ?? '';
    const up = String(raw).toUpperCase();
    if (up.includes('ADMIN')) return 'ADMIN';
    if (up.includes('BLACKLIST')) return 'BLACKLIST';
    if (up) return 'USER';
    return null;
  } catch {
    return null;
  }
}

/* ------------------------- 페이지 ------------------------- */
export default function LoginPage() {
  const router = useRouter();
  const [memberId, setId] = useState('');
  const [memberPw, setPw] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    purgeAuthArtifacts();
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErr(null);

    try {
      // 1) 로그인 (토큰/쿠키 세팅은 member.api가 수행)
      const data = await login({ memberId, memberPw });

      // 2) dev 확인용 ID 저장
      if (typeof window !== 'undefined') {
        localStorage.setItem('memberId', memberId);
        localStorage.setItem('loginId', memberId);
      }

      // 3) 역할 판별: JWT → 응답 → 서버 조회 → 없으면 USER
      const tok =
        (typeof window !== 'undefined' && (localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken'))) ||
        getCookie('Authorization') || '';
      let role: 'ADMIN' | 'BLACKLIST' | 'USER' | null = roleFromJwt(tok);

      if (!role) {
        const r: any = (data as any)?.result ?? (data as any);
        const bag: string[] = [];
        bag.push(...toUpperArray(r?.memberRole));
        bag.push(...toUpperArray(r?.role));
        bag.push(...toUpperArray(r?.roles));
        bag.push(...toUpperArray(r?.authorities));
        if (Number(r?.roleId) === 1) role = 'ADMIN';
        else role = pickRoleFromBag(bag);
      }

      if (!role) {
        const fromServer = await roleFromServer();
        if (fromServer) role = fromServer;
      }

      if (!role) role = 'USER';

      // Application Storage에 항상 기록
      localStorage.setItem('memberRole', role);

      //블랙리스트 계정 로그인 차단
      if (role === 'BLACKLIST') {
        purgeAuthArtifacts?.();
        try {
          localStorage.removeItem('memberRole');
        } catch {}
        window.alert('해당 계정은 이용이 제한되어 로그인할 수 없습니다');
        return; 
        }


      // 헤더 즉시 반영
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-changed'));
      }
      router.replace('/');
    } catch (e: any) {
      setErr(e?.message || '아이디/비밀번호를 잘 못 입력하셨습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------- UI: 원본 그대로 ---------------- */
  return (
    <main className="mx-auto max-w-[500px] px-4 py-8 text-center">
      <h1 className="text-2xl font-semibold mb-4">
        Login<PawIcon/>
      </h1>
      <hr className="border-gray-200 mb-20" />
      <br />
      <form onSubmit={onSubmit}>
        <div className="row">
          <span className="label">ID</span>
          <input className="input" value={memberId} onChange={(e) => setId(e.target.value)} />
        </div>

        <div className="row">
          <span className="label">PASSWORD</span>
          <input className="input" type="password" value={memberPw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <br />
        <hr className="border-gray-200 mb-6" />
        <br />
        <div className="flex justify-center mt-7">
          <button className="btn-3d btn-white text-black" disabled={submitting}>
            {submitting ? '로그인 중…' : '로그인'}
          </button>
        </div>
        <br />
        <br />

        {err && <p className="text-red-600 text-sm text-center mt-3 whitespace-pre-line">{err}</p>}
      </form>

      <style jsx global>{`
        .row { display:flex; align-items:center; justify-content:center; gap:12px; margin:14px 0; }
        .label { color:#111; font-size:1.1rem; font-weight:500; }
        .input { display:inline-block; border:1px solid #e5e7eb; border-radius:6px; height:26px; padding:3px 8px; font-size:13.5px; color:#111; width:130px; }
        .btn-3d { padding:8px 14px; border-radius:10px; border:1px solid #2222; background:#fff; box-shadow:0 1px 0 #fff inset, 0 6px 0 rgba(0,0,0,0); }
        .btn-white { background:#fff; }
      `}</style>
    </main>
  );
}
