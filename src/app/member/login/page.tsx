// app/member/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/features/member/data/member.api';
import PawIcon from '@/components/icons/Paw';

/* ---- JWT payload 디코드(서명검증X) & 역할 추출 ---- */
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
  } catch {
    return null;
  }
}
function payloadHasAdmin(p: JwtPayload | null): boolean {
  if (!p) return false;
  const picks: string[] = [];
  const push = (v?: string | string[]) => {
    if (!v) return;
    if (Array.isArray(v)) picks.push(...v);
    else picks.push(v);
  };
  push(p.role); push(p.roles); push(p.authorities); push(p.auth); push(p.memberRole);
  const up = picks.map(s => String(s).toUpperCase());
  return up.some(s => s.includes('ROLE_ADMIN') || s === 'ADMIN');
}
function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = document.cookie.match(new RegExp('(?:^|; )' + safe + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
function authHeaders(): Record<string, string> {
  const tok =
    (typeof window !== 'undefined' && (localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken'))) ||
    getCookie('Authorization') ||
    '';
  if (!tok) return {};
  return { Authorization: tok.startsWith('Bearer ') ? tok : `Bearer ${tok}` };
}

export default function LoginPage() {
  const router = useRouter();
  const [memberId, setId] = useState('');
  const [memberPw, setPw] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /** 서버에서 ADMIN 확인: ADMIN이면 저장, 아니면 지움(=USER로 저장 금지) */
  async function stampAdminFromServer(id: string) {
    const base =
      process.env.NEXT_PUBLIC_API_BASE ||
      (typeof window !== 'undefined'
        ? window.location.origin.replace(':3000', ':8000')
        : '');

    // 1) /member/me
    try {
      const r = await fetch(new URL('/member/me', base), { credentials: 'include', headers: authHeaders() });
      if (r.ok) {
        const data = await r.json().catch(() => ({}));
        const raw = data?.memberRole ?? data?.role ?? data?.roles ?? data?.authorities ?? '';
        const up = (Array.isArray(raw) ? raw.join(',') : String(raw)).toUpperCase();
        if (up.includes('ROLE_ADMIN') || up.includes('ADMIN')) {
          localStorage.setItem('memberRole', 'ADMIN');
          return true;
        }
      }
    } catch {}

    // 2) /member/readOne/{id}
    try {
      if (id) {
        const r2 = await fetch(new URL(`/member/readOne/${encodeURIComponent(id)}`, base), {
          credentials: 'include',
          headers: authHeaders(),
        });
        if (r2.ok) {
          const data = await r2.json().catch(() => ({}));
          const raw = data?.memberRole ?? data?.role ?? data?.roles ?? data?.authorities ?? '';
          const up = (Array.isArray(raw) ? raw.join(',') : String(raw)).toUpperCase();
          if (up.includes('ROLE_ADMIN') || up.includes('ADMIN')) {
            localStorage.setItem('memberRole', 'ADMIN');
            return true;
          }
        }
      }
    } catch {}

    // ADMIN 아님/모름 → key 제거(=USER로 저장하지 않음)
    localStorage.removeItem('memberRole');
    return false;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErr(null);

    try {
      // 1) 로그인 (토큰/세션 쿠키 세팅)
      await login({ memberId, memberPw });

      // 2) 로그인한 아이디 저장(호환)
      if (typeof window !== 'undefined') {
        localStorage.setItem('memberId', memberId);
        localStorage.setItem('loginId', memberId);
      }

      // 3) 토큰에서 ADMIN 판정 → 실패 시 서버에서 보강
      let stamped = false;
      try {
        const tok =
          (typeof window !== 'undefined' && (localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken'))) ||
          getCookie('Authorization') || '';
        const payload = decodeJwt(tok);
        if (payload && payloadHasAdmin(payload)) {
          localStorage.setItem('memberRole', 'ADMIN');
          stamped = true;
        }
      } catch {}

      if (!stamped) {
        await stampAdminFromServer(memberId);
      }

      // 4) 알림 & 이동
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-changed'));
      }
      router.replace('/');
    } catch (e: any) {
      setErr(e?.message || '로그인에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

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
