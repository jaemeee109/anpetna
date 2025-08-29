// app/member/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/features/member/data/member.api'; // ✅ 여기만 믿고 씁니다

export default function LoginPage() {
  const router = useRouter();
  const [memberId, setId] = useState('');
  const [memberPw, setPw] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErr(null);

    try {
      // ✅ 이 login()이 access/refresh 토큰을 localStorage+cookie에 저장합니다.
      //    - 바디/헤더 어디에 오든 처리함.
      await login({ memberId, memberPw });

      // 선택: 로그인한 아이디도 필요하면 저장(기존 코드 호환용)
      if (typeof window !== 'undefined') {
        localStorage.setItem('memberId', memberId);
        localStorage.setItem('loginId', memberId);
        window.dispatchEvent(new Event('auth-changed'));
      }

      // 성공 시 메인이나 원래 가려던 곳으로 이동
      router.replace('/');
    } catch (e: any) {
      setErr(e?.message || '로그인에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-[500px] px-4 py-8 text-center">
      <h1 className="text-2xl font-semibold mb-4">Login</h1>

      <form onSubmit={onSubmit}>
        <div className="row">
          <span className="label">ID</span>
          <input className="input" value={memberId} onChange={(e) => setId(e.target.value)} />
        </div>

        <div className="row">
          <span className="label">PASSWORD</span>
          <input className="input" type="password" value={memberPw} onChange={(e) => setPw(e.target.value)} />
        </div>

        <div className="flex justify-center mt-4">
          <button className="btn-3d btn-white text-black" disabled={submitting}>
            {submitting ? '로그인 중…' : '로그인하기'}
          </button>
        </div>

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
