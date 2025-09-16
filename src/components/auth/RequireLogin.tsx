'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getAccessToken } from '@/shared/data/http';
function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = document.cookie.match(new RegExp('(?:^|; )' + safe + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

// 추가: 공용 http 유틸에서 만료 토큰을 자동 정리해주는 getAccessToken 사용
function isAuthed(): boolean {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true') return true;
  if (typeof window === 'undefined') return false;

  // 유효한 액세스 토큰이 있을 때만 true (만료/손상 토큰은 getAccessToken에서 이미 제거됨)
  const t = getAccessToken();
  if (t && String(t).trim()) return true;

  // 서버 세션(JSESSIONID)만 있는 경우도 허용
  return !!getCookie('JSESSIONID');
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
