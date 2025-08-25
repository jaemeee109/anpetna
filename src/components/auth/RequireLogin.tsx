'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = document.cookie.match(new RegExp('(?:^|; )' + safe + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function isAuthed() {
  // 개발 우회 스위치
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true') return true;

  if (typeof window === 'undefined') return false;
  return !!(
    localStorage.getItem('accessToken') ||
    getCookie('accessToken') ||
    getCookie('JSESSIONID')
  );
}


export default function RequireLogin({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const pathname = usePathname();
  const search = typeof window !== 'undefined' ? window.location.search : '';

  useEffect(() => {
    setAuthed(isAuthed());
  }, []);

  // 첫 렌더에서 깜빡임 방지
  if (authed === null) return null;

  if (!authed) {
    const next = encodeURIComponent((pathname || '/') + (search || ''));
    return (
      <div className="auth-wall">
        <p>로그인한 사람만 볼 수 있습니다.</p>
        <p>
          <Link href={`/login?next=${next}`} className="btn-3d btn-white">
            로그인하기
          </Link>
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
