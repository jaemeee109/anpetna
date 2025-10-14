// src/components/auth/RequireLogin.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

function getCookie(name: string) {
  try {
    const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = document.cookie.match(new RegExp('(?:^|; )' + safe + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  } catch { return ''; }
}

function hasAuthNow(): boolean {
  try {
    return !!(
      localStorage.getItem('accessToken') ||
      localStorage.getItem('access_token') ||
      getCookie('JSESSIONID')
    );
  } catch { return false; }
}

export default function RequireLogin({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const alerted = useRef(false); // ← 누락되었던 부분 (추가)

  const evaluate = () => setAuthed(hasAuthNow());

  useEffect(() => {
    evaluate();

    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (/accessToken|access_token|Authorization|memberId|loginId|memberRole/i.test(e.key))
        evaluate();
    };
    const onFocus = () => evaluate();
    const onAuthChanged = () => evaluate();

    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    window.addEventListener('auth-changed', onAuthChanged as EventListener);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('auth-changed', onAuthChanged as EventListener);
    };
  }, []);

  useEffect(() => {
    if (authed === false) {
      if (!alerted.current) {
        alerted.current = true;
        alert('회원만 이용이 가능합니다');
      }
      router.replace('/member/login');
    }
  }, [authed, router]);

  if (authed === null) return null; // 초기 깜빡임 방지
  if (!authed) return null;
  return <>{children}</>;
}
