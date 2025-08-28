'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { serverLogout, purgeAuthArtifacts } from '@/features/member/data/session';

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

function hasToken(): boolean {
  if (typeof window === 'undefined') return false;
  const ls = localStorage.getItem('accessToken') || localStorage.getItem('memberId');
  const ck = getCookie('accessToken') || getCookie('JSESSIONID');
  return !!(ls || ck);
}

/** 로컬 저장소/쿠키에서 role을 추정 (백엔드가 주입해줄 때 사용) */
function readRoleRaw(): string | null {
  if (typeof window === 'undefined') return null;
  // 프로젝트에서 사용하는 키가 있다면 여기에 추가
  return (
    localStorage.getItem('memberRole') ||
    getCookie('memberRole') ||
    null
  );
}

/** ADMIN 여부 판별 (숫자/문자열 모두 허용) */
function isAdminRole(raw: string | null): boolean {
  if (!raw) return false;
  const v = raw.trim().toUpperCase();
  // 숫자 형태도 허용 (ORDINAL 1 = ADMIN 가정)
  if (v === '1') return true;
  return v === 'ADMIN' || v === 'ROLE_ADMIN';
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState<boolean>(false);
  const [admin, setAdmin] = useState<boolean>(false);

  // ▼ 드롭박스 상태/외부클릭 닫기 (MYPAGE / SYSTEM)
  const [myOpen, setMyOpen] = useState(false);
  const [sysOpen, setSysOpen] = useState(false);
  const myRef = useRef<HTMLDivElement | null>(null);
  const sysRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (myRef.current && !myRef.current.contains(target)) setMyOpen(false);
      if (sysRef.current && !sysRef.current.contains(target)) setSysOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  // 초기 렌더에서 로그인/역할 계산
  useEffect(() => {
    setAuthed(hasToken());
    setAdmin(isAdminRole(readRoleRaw()));
  }, []);

  // 같은 탭/다른 탭에서 로그인 상태/역할 변경 반영
  useEffect(() => {
    const onAuthChanged = () => {
      setAuthed(hasToken());
      setAdmin(isAdminRole(readRoleRaw()));
    };
    window.addEventListener('auth-changed', onAuthChanged);

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'accessToken' || e.key === 'memberId' || e.key === 'memberRole') {
        setAuthed(hasToken());
        setAdmin(isAdminRole(readRoleRaw()));
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('auth-changed', onAuthChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // 라우트 이동 시 한 번 더 동기화
  useEffect(() => {
    setAuthed(hasToken());
    setAdmin(isAdminRole(readRoleRaw()));
  }, [pathname]);

  const handleLogout = async () => {
    await serverLogout();
    purgeAuthArtifacts();
    window.dispatchEvent(new Event('auth-changed'));
    setMyOpen(false);
    setSysOpen(false);
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
      {/* 상단 우측 JOIN/LOGIN or (SYSTEM) / MYPAGE / CART / LOGOUT */}
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
              {/* ▼ SYSTEM 드롭박스 (ADMIN 전용) */}
              {admin && (
                <>
                  <div
                    className="dropdown"
                    ref={sysRef}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSysOpen((v) => !v);
                      setMyOpen(false);
                    }}
                  >
                    <button
                      type="button"
                      className="btn-link"
                      aria-haspopup="true"
                      aria-expanded={sysOpen ? 'true' : 'false'}
                    >
                      SYSTEM
                    </button>
                    {sysOpen && (
                      <div className="dropdown-menu" role="menu" aria-label="System submenu">
                        {/* 아직 실제 페이지 없음 → '#' + preventDefault */}
                        <a
                          href="#"
                          className="dropdown-item"
                          role="menuitem"
                          onClick={(e) => {
                            e.preventDefault();
                            setSysOpen(false);
                          }}
                        >
                          USER
                        </a>
                        <a
                          href="#"
                          className="dropdown-item"
                          role="menuitem"
                          onClick={(e) => {
                            e.preventDefault();
                            setSysOpen(false);
                          }}
                        >
                          SALES
                        </a>
                        <a
                          href="#"
                          className="dropdown-item"
                          role="menuitem"
                          onClick={(e) => {
                            e.preventDefault();
                            setSysOpen(false);
                          }}
                        >
                          INV
                        </a>
                      </div>
                    )}
                  </div>
                  <span className="sep">|</span>
                </>
              )}

              {/* ▼ MYPAGE 드롭박스 */}
              <div
                className="dropdown"
                ref={myRef}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMyOpen((v) => !v);
                  setSysOpen(false);
                }}
              >
                <button
                  type="button"
                  className="btn-link"
                  aria-haspopup="true"
                  aria-expanded={myOpen ? 'true' : 'false'}
                >
                  MYPAGE
                </button>
                {myOpen && (
                  <div className="dropdown-menu" role="menu" aria-label="MyPage submenu">
                    <Link href="/member/info" className="dropdown-item" role="menuitem" onClick={() => setMyOpen(false)}>
                      INFO
                    </Link>
                    <Link href="/member/orders" className="dropdown-item" role="menuitem" onClick={() => setMyOpen(false)}>
                      ORDER
                    </Link>
                    <Link href="/member/delete" className="dropdown-item" role="menuitem" onClick={() => setMyOpen(false)}>
                      DEL
                    </Link>
                  </div>
                )}
              </div>

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

      {/* 네비게이션 */}
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
            <Link href="/board/FAQ" className="dropdown-item" role="menuitem">FAQ</Link>
            <Link href="/board/QNA" className="dropdown-item" role="menuitem">Q&A</Link>
          </div>
        </div>
      </nav>

      <div className="apn-divider" />
    </header>
  );
}
