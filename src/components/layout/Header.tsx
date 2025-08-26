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

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = document.cookie.match(new RegExp('(?:^|; )' + safe + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token =
      typeof window !== 'undefined' &&
      (localStorage.getItem('accessToken') ||
        getCookie('accessToken') ||
        getCookie('JSESSIONID'));
    setAuthed(!!token);
  }, []);

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      document.cookie = 'accessToken=; Max-Age=0; path=/';
      document.cookie = 'JSESSIONID=; Max-Age=0; path=/';
    }
    setAuthed(false);
    router.replace('/');
  };

  const helpActive =
    pathname === '/board/FAQ' ||
    pathname === '/board/QNA' ||
    pathname === '/board/Help' ||
    pathname?.startsWith('/board/FAQ/') ||
    pathname?.startsWith('/board/QNA/');

  return (
    <header className="apn-header">
      {/* 상단 우측 JOIN/LOGIN or MYPAGE/CART/LOGOUT */}
      <div className="container apn-topbar">
        <nav className="apn-auth">
          {!authed ? (
            <>
             <Link href="/member/signup">JOIN</Link>
              <span className="sep">|</span>
              <Link href="/member/login">LOGIN</Link>
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
        <NavLink href="/board/FREE">BOARD</NavLink>

        {/* HELP + 드롭다운 */}
        <div className="dropdown group">
          <button
            type="button"
            className={`pill ${helpActive ? 'pill--active' : ''}`}
            aria-haspopup="true"
            aria-expanded={helpActive ? 'true' : 'false'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            HELP
          </button>
          <div className="dropdown-menu" role="menu" aria-label="Help submenu">
            <Link href="/board/FAQ" className="dropdown-item" role="menuitem">
              FAQ
            </Link>
            <Link href="/board/QNA" className="dropdown-item" role="menuitem">
              Q&A
            </Link>
          </div>
        </div>
      </nav>

      {/* 얇은 가로선 */}
      <div className="apn-divider" />
    </header>
  );
}
