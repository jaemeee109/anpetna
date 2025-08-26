// app/member/login/page.tsx
'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type LoginBody = { memberId: string; memberPw: string };

export default function LoginPage() {
  const router = useRouter();

  const [memberId, setId] = useState('');
  const [memberPw, setPw] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // === 포트 8000 사용 (env 우선, 없으면 3000에서 자동 8000으로 전환) ===
  const BASE =
    (process.env.NEXT_PUBLIC_API_BASE as string | undefined) ||
    (typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}${
          window.location.port
            ? `:${window.location.port === '3000' ? '8000' : window.location.port}`
            : ''
        }`.replace(/:$/, '')
      : '');

  // 프록시/컨텍스트 경로: 프로젝트가 '/anpetna' 를 쓰고 있으므로 기본값 유지
  const API_PREFIX = (process.env.NEXT_PUBLIC_API_PREFIX as string | undefined) ?? '/anpetna';

  function apiURL(path: string) {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return new URL(`${API_PREFIX}${normalized}`, BASE).toString();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setErr(null);

      const payload: LoginBody = { memberId, memberPw };

      // ★ 백엔드 확인 결과: MemberController에 POST "/member/login" 존재
      //   (클래스 @RequestMapping("/member") + @PostMapping("/login"))
      //   컨텍스트(/anpetna) 유무 모두 시도
      const candidates = [
        apiURL('/member/login'),
        new URL('/member/login', BASE).toString(),
      ];

      let ok = false;
      let lastText = '';
      for (const url of candidates) {
        try {
          const resp = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (resp.ok) {
            const data = await resp.json().catch(() => ({} as any));
            const token = data?.accessToken ?? data?.token ?? data?.jwt ?? data?.result?.token;
            if (token && typeof window !== 'undefined') {
              localStorage.setItem('accessToken', token);
              localStorage.setItem('memberId', memberId);
            }
            ok = true;
            break;
          }
          lastText = `HTTP ${resp.status} ${await resp.text().catch(() => '')}`;
        } catch (e: any) {
          lastText = String(e?.message || e);
        }
      }

      if (!ok) throw new Error(`로그인 실패 (/member/login)\n${lastText}`.trim());

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
      {/* 타이틀: SignUp 페이지와 동일한 발바닥 아이콘/크기, 가운데 정렬 */}
      <h1 className="text-2xl font-semibold mb-4 flex items-center justify-center gap-2">
        Login&nbsp;
        <svg
          className="w-[1em] h-[1em] text-rose-400"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
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
<br></br>
<br></br>
        {err && <p className="text-red-600 text-sm text-center mt-2 whitespace-pre-line">{err}</p>}
      </form>

      {/* 여백은 여기서 조절:
          - 전체 페이지: <main>의 py-8
          - 블록 사이 간격: <div className="h-2/h-4" />
          - 줄 간격: .row margin 값 */}
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
