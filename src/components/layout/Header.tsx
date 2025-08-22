'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/** 현재 URL과 비교해 pill 활성화 */
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + '/');
  return (
    <Link
      href={href}
      className={`pill ${active ? 'pill--active' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}

/** 클라이언트 저장소/쿠키에서 로그인 여부 판단 (이름은 프로젝트에 맞게 변경) */
function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

export default function Header() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    /* 프로젝트에 맞게 토큰/세션 이름만 바꿔주면 됨 */
    const token =
      typeof window !== 'undefined' &&
      (localStorage.getItem('accessToken')  /* 키이름 */
      || getCookie('accessToken') /* 쿠키 이름 */
      || getCookie('JSESSIONID'));/* 세션 쿠키 이름 */
    setAuthed(!!token);
  }, []);

  const handleLogout = async () => {
    // 필요하면 서버 로그아웃 호출
    // await fetch('/anpetna/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      document.cookie = 'accessToken=; Max-Age=0; path=/';
      document.cookie = 'JSESSIONID=; Max-Age=0; path=/';
    }
    setAuthed(false);
    router.replace('/'); // 홈으로
  };

  return (
    <header className="apn-header">
      {/* 상단 우측 JOIN/LOGIN or MYPAGE/CART/LOGOUT */}
      <div className="container apn-topbar">
        <nav className="apn-auth">
          {!authed ? (
            <>
              <Link href="/join">JOIN</Link>
              <span className="sep">|</span>
              <Link href="/login">LOGIN</Link>
            </>
          ) : (
            <>
              <Link href="/mypage">MYPAGE</Link>
              <span className="sep">|</span>
              <Link href="/cart">CART</Link>
              <span className="sep">|</span>
              <button type="button" className="btn-link" onClick={handleLogout}>
                LOGOUT
              </button>
            </>
          )}
        </nav>
      </div>

      {/* 중앙 로고 */}
      <div className="apn-logo">
        <Link href="/" aria-label="AnPetNa">
          <img src="/anpetna-logo1.png" alt="AnPetNa" className="apn-logo-img" />
        </Link>
      </div>

      {/* 네비게이션 (알약 버튼) */}
      <nav className="container apn-nav">
        <NavLink href="/board/NOTICE">NOTICE</NavLink>
        <NavLink href="/items">STORE</NavLink>
        <NavLink href="/board/Free">BOARD</NavLink>
        <NavLink href="/board/QNA">HELP</NavLink>
      </nav>

      {/* 얇은 가로선 */}
      <div className="apn-divider" />
    </header>
  );
}
/* 토큰 이름 바꾸기:백엔드에서 쓰는 이름이 다르면 accessToken/JSESSIONID 부분을 프로젝트에 맞게 바꾸기. */
