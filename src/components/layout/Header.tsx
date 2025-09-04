// src/components/layout/Header.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/* -------------------- 쿠키/스토리지 유틸 -------------------- */
function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = document.cookie.match(new RegExp('(?:^|; )' + safe + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; path=/`;
}
function getTokenFromStorage() {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('accessToken') ||
    sessionStorage.getItem('accessToken') ||
    getCookie('Authorization') ||
    ''
  );
}
/** 항상 Record<string,string> 반환해 타입 오류 방지 */
function authHeaders(): Record<string, string> {
  const raw = getTokenFromStorage();
  if (!raw) return {};
  const val = raw.startsWith('Bearer ') ? raw : `Bearer ${raw}`;
  return { Authorization: val };
}
function clearLocalAuth() {
  try { localStorage.removeItem('accessToken'); } catch {}
  try { localStorage.removeItem('refreshToken'); } catch {}
  try { localStorage.removeItem('memberId'); } catch {}
  try { localStorage.removeItem('memberRole'); } catch {}
  try { sessionStorage.removeItem('accessToken'); } catch {}
  try { sessionStorage.removeItem('refreshToken'); } catch {}
  deleteCookie('Authorization');
  deleteCookie('accessToken');
  deleteCookie('refreshToken');
  deleteCookie('JSESSIONID');
  deleteCookie('memberRole');
}
function hasAnyLocalAuth(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    getTokenFromStorage() ||
    localStorage.getItem('memberId') ||
    localStorage.getItem('memberRole') ||
    getCookie('JSESSIONID')
  );
}

/* -------------------- JWT 디코더 -------------------- */
type JwtPayload = {
  sub?: string;
  exp?: number;
  role?: string | string[];
  roles?: string[];
  authorities?: string[] | string;
  auth?: string;
  memberRole?: string;
  [k: string]: any;
};
function decodeJwt(token: string): JwtPayload | null {
  try {
    const t = token.startsWith('Bearer ') ? token.slice(7) : token;
    const [, payload] = t.split('.');
    if (!payload) return null;
    const json = JSON.parse(
      decodeURIComponent(escape(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))))
    );
    return json;
  } catch { return null; }
}
function payloadHasAdmin(p: JwtPayload | null) {
  if (!p) return false;
  const bag: string[] = [];
  const push = (v?: string | string[]) => {
    if (!v) return;
    if (Array.isArray(v)) bag.push(...v); else bag.push(v);
  };
  push(p.role); push(p.roles); push(p.authorities); push(p.auth); push(p.memberRole);
  return bag.map(s => String(s).toUpperCase()).some(s => s.includes('ROLE_ADMIN') || s === 'ADMIN');
}

/* -------------------- 본 컴포넌트 -------------------- */
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + '/');
  return (
    <Link href={href} className={`pill ${active ? 'pill--active' : ''}`} aria-current={active ? 'page' : undefined}>
      {children}
    </Link>
  );
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const [authed, setAuthed] = useState(false);
  const [admin, setAdmin] = useState(false);

  // 드롭다운
  const [myOpen, setMyOpen] = useState(false);
  const [sysOpen, setSysOpen] = useState(false);
  const myRef = useRef<HTMLDivElement | null>(null);
  const sysRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (myRef.current && !myRef.current.contains(t)) setMyOpen(false);
      if (sysRef.current && !sysRef.current.contains(t)) setSysOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  // 1차: 로컬에서 인증/ADMIN 판정 + memberRole 기본값 보장
  function evaluateAuthFromLocal() {
    const anyAuth = hasAnyLocalAuth();
    if (!anyAuth) {
      setAuthed(false);
      setAdmin(false);
      return;
    }
    setAuthed(true);

    const raw = getTokenFromStorage();
    const isAdminByJwt = payloadHasAdmin(raw ? decodeJwt(raw) : null);

    // 저장된 memberRole (ADMIN만 신뢰)
    const stored = (typeof window !== 'undefined' && localStorage.getItem('memberRole')) || '';
    const up = String(stored || '').toUpperCase();
    const isAdminStored = up === 'ADMIN' || up === 'ROLE_ADMIN';

    // 로컬 표시 보장: 토큰만 있고 저장이 없으면 USER로 임시 표기
    if (!stored && raw) {
      try {
        localStorage.setItem('memberRole', isAdminByJwt ? 'ADMIN' : 'USER');
      } catch {}
    }
    setAdmin(!!(isAdminByJwt || isAdminStored));
  }

  // 2차: 서버에서 역할 확정 (ADMIN/BLACKLIST/USER 중 하나를 memberRole로 고정 저장)
  async function verifyRoleFromServerIfNeeded() {
    if (!hasAnyLocalAuth()) return;

    // 이미 ADMIN이면 서버 확인 생략 가능
    const raw = getTokenFromStorage();
    const isAdminByJwt = payloadHasAdmin(raw ? decodeJwt(raw) : null);
    const stored = (typeof window !== 'undefined' && localStorage.getItem('memberRole')) || '';
    const up = String(stored || '').toUpperCase();
    const isAdminStored = up === 'ADMIN' || up === 'ROLE_ADMIN';
    if (isAdminByJwt || isAdminStored) {
      setAdmin(true); setAuthed(true);
      return;
    }

    const base =
      process.env.NEXT_PUBLIC_API_BASE ||
      (typeof window !== 'undefined'
        ? window.location.origin.replace(':3000', ':8000')
        : '');
    const candidates = ['/member/me', '/jwt/me', '/auth/me'];

    for (const p of candidates) {
      try {
        const r = await fetch(new URL(p, base), { credentials: 'include', headers: authHeaders() });
        if (r.status === 401 || r.status === 403) {
          // 인증 아님
          localStorage.removeItem('memberRole');
          setAdmin(false); setAuthed(false);
          return;
        }
        if (!r.ok) continue;
        const data = await r.json().catch(() => ({}));
        const rawRole = data?.memberRole ?? data?.role ?? data?.roles ?? data?.authorities ?? '';
        const roleStr = (Array.isArray(rawRole) ? rawRole.join(',') : String(rawRole)).toUpperCase();

        let norm: 'ADMIN' | 'BLACKLIST' | 'USER' = 'USER';
        if (roleStr.includes('BLACKLIST')) norm = 'BLACKLIST';
        if (roleStr.includes('ADMIN') || roleStr.includes('ROLE_ADMIN')) norm = 'ADMIN';

        try { localStorage.setItem('memberRole', norm); } catch {}
        setAdmin(norm === 'ADMIN'); setAuthed(true);
        return;
      } catch {
        // 다음 후보로
      }
    }

    // 서버에서 못 알아냈으면 USER로 유지 (토큰이 있다면)
    if (raw) {
      try { localStorage.setItem('memberRole', 'USER'); } catch {}
      setAdmin(false); setAuthed(true);
    } else {
      localStorage.removeItem('memberRole');
      setAdmin(false); setAuthed(false);
    }
  }

  useEffect(() => {
    evaluateAuthFromLocal();
    verifyRoleFromServerIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (['accessToken', 'access_token', 'refreshToken', 'memberRole'].includes(e.key || '')) {
        evaluateAuthFromLocal();
        verifyRoleFromServerIfNeeded();
      }
    };
    const onFocus = () => {
      evaluateAuthFromLocal();
      verifyRoleFromServerIfNeeded();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    const base =
      process.env.NEXT_PUBLIC_API_BASE ||
      (typeof window !== 'undefined'
        ? window.location.origin.replace(':3000', ':8000')
        : '');
    try { await fetch(new URL('/jwt/logout', base), { method: 'POST', credentials: 'include', headers: authHeaders() }); } catch {}
    try { await fetch(new URL('/member/logout', base), { method: 'POST', credentials: 'include', headers: authHeaders() }); } catch {}

    clearLocalAuth();
    setMyOpen(false); setSysOpen(false);
    setAuthed(false); setAdmin(false);

    router.replace('/');
    setTimeout(() => { if (typeof window !== 'undefined') window.location.reload(); }, 50);
  }

  const helpActive =
    pathname === '/board/FAQ' ||
    pathname === '/board/QNA' ||
    pathname === '/board/Help' ||
    pathname?.startsWith('/board/FAQ/') ||
    pathname?.startsWith('/board/QNA/');

  return (
    <header className="apn-header">
      {/* 상단 우측 */}
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
                    <button type="button" className="btn-link" aria-haspopup="true" aria-expanded={sysOpen ? 'true' : 'false'}>
                      SYSTEM
                    </button>
                    {sysOpen && (
                      <div className="dropdown-menu" role="menu" aria-label="System submenu">
                        <a href="#" className="dropdown-item" role="menuitem" onClick={(e) => { e.preventDefault(); setSysOpen(false); }}>
                          USER
                        </a>
                        <a href="#" className="dropdown-item" role="menuitem" onClick={(e) => { e.preventDefault(); setSysOpen(false); }}>
                          SALES
                        </a>
                        <a href="#" className="dropdown-item" role="menuitem" onClick={(e) => { e.preventDefault(); setSysOpen(false); }}>
                          INV
                        </a>
                      </div>
                    )}
                  </div>
                  <span className="sep">|</span>
                </>
              )}

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
                <button type="button" className="btn-link" aria-haspopup="true" aria-expanded={myOpen ? 'true' : 'false'}>
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

      <div className="apn-logo">
        <Link href="/" aria-label="AnPetNa">
          <img src="/anpetna-logo1.png" alt="AnPetNa" className="apn-logo-img" />
        </Link>
      </div>

      <nav className="container apn-nav">
        <NavLink href="/board/NOTICE">NOTICE</NavLink>
        <NavLink href="/items">STORE</NavLink>
        <NavLink href="/board/FREE">BOARD</NavLink>

        <div className="dropdown group">
          <button
            type="button"
            className={`pill ${helpActive ? 'pill--active' : ''}`}
            aria-haspopup="true"
            aria-expanded={helpActive ? 'true' : 'false'}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            HELP
          </button>
          <div className="dropdown-menu" role="menu" aria-label="Help submenu">
            <Link href="/board/FAQ" className="dropdown-item" role="menuitem">FAQ</Link>
            <Link href="/board/QNA" className="dropdown-item" role="menuitem">Q&amp;A</Link>
          </div>
        </div>
      </nav>

      <div className="apn-divider" />
    </header>
  );
}
