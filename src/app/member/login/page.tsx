// app/member/login/page.tsx
'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type LoginBody = { memberId: string; memberPw: string };

// ===== 유틸: 안전 JSON 파서 =====
async function parseJsonSafe(resp: Response): Promise<any> {
  const text = await resp.text().catch(() => '');
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

/** 응답에서 access token 최대한 안전하게 뽑기 */
function pickAccessTokenPreferably(d: any): string | undefined {
  const direct =
    d?.accessToken ?? d?.result?.accessToken ?? d?.dto?.accessToken;
  if (direct) return direct;

  const tokenLike =
    d?.token ?? d?.result?.token ?? d?.dto?.token ??
    d?.jwt ?? d?.result?.jwt ?? d?.dto?.jwt;

  const tokenType = (d?.tokenType ?? d?.result?.tokenType ?? d?.dto?.tokenType ?? '').toString().toLowerCase();
  const grantType = (d?.grantType ?? d?.result?.grantType ?? d?.dto?.grantType ?? '').toString().toLowerCase();

  if (tokenLike) {
    if (!d?.refreshToken && !d?.result?.refreshToken && !d?.dto?.refreshToken) return tokenLike;
    if (tokenType.includes('bearer') || tokenType.includes('access')) return tokenLike;
    if (grantType.includes('bearer') || grantType.includes('access')) return tokenLike;
    return tokenLike;
  }
  return undefined;
}

function pickRefreshToken(d: any): string | undefined {
  return d?.refreshToken ?? d?.result?.refreshToken ?? d?.dto?.refreshToken;
}
function pickMemberId(d: any): string | undefined {
  return d?.memberId ?? d?.result?.memberId ?? d?.dto?.memberId;
}

// ===== 베이스/프리픽스/로그인경로 =====
const BASE =
  (process.env.NEXT_PUBLIC_API_BASE as string | undefined) ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}${
        window.location.port
          ? `:${window.location.port === '3000' ? '8000' : window.location.port}`
          : ''
      }`.replace(/:$/, '')
    : '');

const API_PREFIX = (process.env.NEXT_PUBLIC_API_PREFIX as string | undefined) ?? '';
const LOGIN_PATH = (process.env.NEXT_PUBLIC_LOGIN_PATH as string | undefined) ?? '/jwt/login';

function absUrl(path: string) {
  // 절대경로만 사용 (API_PREFIX는 사용자가 필요 시 LOGIN_PATH에 직접 포함)
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalized, BASE).toString();
}

// 하나의 URL만 시도 (정확한 로그인 URL을 .env로 지정)
async function doLogin(url: string, payload: LoginBody) {
  try {
    // 1) with omit
    const r1 = await fetch(url, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (r1.ok) return { ok: true, status: r1.status, data: await parseJsonSafe(r1) };

    // 2) with include (세션/쿠키 방식 대비)
    const r2 = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (r2.ok) return { ok: true, status: r2.status, data: await parseJsonSafe(r2) };

    return { ok: false, status: r2.status, data: await parseJsonSafe(r2) };
  } catch (e: any) {
    return { ok: false, status: 0, data: { error: String(e?.message || e) } };
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [memberId, setId] = useState('');
  const [memberPw, setPw] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setErr(null);

      const payload: LoginBody = { memberId, memberPw };
      const url = absUrl(LOGIN_PATH);

      const res = await doLogin(url, payload);

      if (!res.ok) {
        const body = res.data;
        // 404면 로그인 URL이 틀린 것
        if (res.status === 404) {
          throw new Error(`로그인 경로가 없습니다(404).\n현재 시도한 URL: ${url}\nNEXT_PUBLIC_LOGIN_PATH 값을 서버 실제 엔드포인트로 맞춰주세요.`);
        }
        // 401 같은 인증 실패 메시지는 그대로 노출
        const msg =
          body?.message || body?.detail || body?.error || JSON.stringify(body).slice(0, 300);
        throw new Error(`로그인 실패 (HTTP ${res.status})\n${msg}`);
      }

      const data = res.data;
      const access = pickAccessTokenPreferably(data);
      const refresh = pickRefreshToken(data);
      const id = pickMemberId(data) || memberId;

      if (!access) {
        throw new Error(`응답에 access token이 없습니다. 응답: ${JSON.stringify(data).slice(0, 300)}`);
      }

      // 저장
      localStorage.removeItem('jwt');
      localStorage.setItem('accessToken', access);
      localStorage.setItem('Authorization', access.startsWith('Bearer ') ? access : `Bearer ${access}`);
      if (id) localStorage.setItem('memberId', id);
      if (refresh) localStorage.setItem('refreshToken', refresh);

      // 쿠키 보조 저장
      const maxAge = 60 * 60 * 12;
      document.cookie = `Authorization=${access.startsWith('Bearer ') ? access : 'Bearer ' + access}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
      document.cookie = `accessToken=${access}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
      if (refresh) document.cookie = `refreshToken=${refresh}; Path=/; Max-Age=${60*60*24*7}; SameSite=Lax`;

      // 헤더 갱신 브로드캐스트
      window.dispatchEvent(new Event('auth-changed'));

      alert('로그인 되었습니다.');
      router.replace('/');
    } catch (e: any) {
      setErr(e?.message || '로그인 실패');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-[500px] px-4 py-8 text-center">
      {/* 타이틀 디자인 동일 유지 */}
      <h1 className="text-2xl font-semibold mb-4 flex items-center justify-center gap-2">
        Login&nbsp;
        <svg className="w-[1em] h-[1em] text-rose-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="7" cy="7" r="2.2" />
          <circle cx="12" cy="6" r="2.2" />
          <circle cx="17" cy="7" r="2.2" />
          <path d="M12 12c-3 0-5.5 2-5.5 4.5 0 1.4 1 2.5 2.5 2.5 1.1 0 2.1-.6 3-1 0.9.4 1.9 1 3 1 1.5 0 2.5-1.1 2.5-2.5 0-2.5-2.5-4.5-5.5-4.5z"/>
        </svg>
      </h1>

      <div className="h-2" />
      <hr className="border-gray-200" />
      <div className="h-4" />

      <form onSubmit={onSubmit}>
        <Row label="ID">
          <input className="input" value={memberId} onChange={(e) => setId(e.target.value)} />
        </Row>

        <Row label="PASSWORD">
          <input
            className="input"
            type="password"
            value={memberPw}
            onChange={(e) => setPw(e.target.value)}
          />
        </Row>
        <div className="h-2" />
        <hr className="border-gray-200" />
        <br></br>
        <div className="h-4" />
        <div className="flex justify-center">
          <button className="btn-3d btn-white text-black" disabled={submitting}>
            {submitting ? '로그인 중…' : '로그인하기'}
          </button>
        </div>

        <div className="h-4" />
        <p className="text-center text-sm text-gray-400 select-none">
          아이디 찾기 / 비밀번호 찾기
        </p>
        <br />
        <br />
        {err && <p className="text-red-600 text-sm text-center mt-2 whitespace-pre-line">{err}</p>}
      </form>

      <style jsx global>{`
        .row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 14px 0;
          text-align: center;
        }
        .label {
          color: #111;
          font-size: 1.1rem;
          font-weight: 500;
        }
        .input {
          display: inline-block;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          height: 26px;
          padding: 3px 8px;
          font-size: 13.5px;
          color: #111;
          width: 130px;
          vertical-align: middle;
        }
        .btn-3d {
          padding: 8px 14px;
          border-radius: 10px;
          border: 1px solid #2222;
          background: #fff;
          box-shadow: 0 1px 0 #fff inset, 0 6px 0 rgba(0,0,0,0.);
        }
        .btn-white { background: #fff; }
      `}</style>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="row">
      <span className="label">{label}</span>
      {children}
    </div>
  );
}
