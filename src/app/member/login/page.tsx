// app/member/login/page.tsx
'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMemberActions } from '../../../features/member/hooks/useMember';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useMemberActions();

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
      const res = await login({ memberId, memberPw });
      if (!res?.accessToken && !res?.token && !res?.jwt) {
        // 토큰 필드가 없더라도 서버 세션 기반일 수 있음. 일단 성공으로 간주.
      }
      alert('로그인 되었습니다.');
      router.replace('/member/profile');
    } catch (e: any) {
      setErr(e?.message || '로그인 실패');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-[480px] px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">로그인</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="block text-sm text-gray-600 mb-1">아이디</span>
          <input className="input" value={memberId} onChange={e => setId(e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-sm text-gray-600 mb-1">비밀번호</span>
          <input className="input" type="password" value={memberPw} onChange={e => setPw(e.target.value)} />
        </label>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn-3d btn-primary" disabled={submitting}>
            {submitting ? '로그인 중…' : '로그인'}
          </button>
        </div>
      </form>
      <style jsx global>{`
        .input { width: 100%; border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; }
        .btn-3d { padding: 10px 16px; border-radius: 10px; border: 1px solid #2222; }
        .btn-primary { background: #111; color: #fff; }
      `}</style>
    </main>
  );
}
