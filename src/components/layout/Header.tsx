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
  const [sysOpen, setSysOpen] = useState(false);     // ※ SYSTEM UI는 제거하지만 원본 흐름 보존을 위해 상태 자체는 유지
  const myRef = useRef<HTMLDivElement | null>(null);
  const sysRef = useRef<HTMLDivElement | null>(null); // ※ 동일

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (myRef.current && !myRef.current.contains(t)) setMyOpen(false);
      if (sysRef.current && !sysRef.current.contains(t)) setSysOpen(false); // 사용처 유지(문제 없음)
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
    const isAdminByJwt = raw ? payloadHasAdmin(decodeJwt(raw)) : false;

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
    // 아예 로컬 인증 흔적이 없으면 종료
    if (!hasAnyLocalAuth()) return;

    const token = getTokenFromStorage();

    // ✅ 이미 ADMIN이면 서버 확인 생략
    const isAdminByJwt = token ? payloadHasAdmin(decodeJwt(token)) : false;
    const stored = (typeof window !== 'undefined' && localStorage.getItem('memberRole')) || '';
    const up = stored.toUpperCase();
    const isAdminStored = up === 'ADMIN' || up === 'ROLE_ADMIN';
    if (isAdminByJwt || isAdminStored) {
      setAuthed(true);
      setAdmin(true);
      return;
    }

    // 토큰이 없으면 서버조회 스킵
    if (!token) {
      if (stored) {
        setAuthed(true);
        setAdmin(isAdminStored);
      } else {
        setAuthed(false);
        setAdmin(false);
      }
      return;
    }

    // 토큰이 있을 때만 서버로 최종 확인
    const id =
      (typeof window !== 'undefined' && (localStorage.getItem('memberId') || localStorage.getItem('loginId'))) || '';
    if (!id) return;

    const base =
      process.env.NEXT_PUBLIC_API_BASE ||
      (typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':8000') : '');

    const candidates = [
      `/member/my_page/${encodeURIComponent(id)}`,
      `/member/readOne/${encodeURIComponent(id)}`,
    ];

    for (const p of candidates) {
      try {
        const r = await fetch(new URL(p, base), { credentials: 'include', headers: authHeaders() });
        if (r.status === 401 || r.status === 403) {
          return;
        }
        if (!r.ok) continue;

        const data = await r.json().catch(() => ({} as any));
        const rawRole =
          data?.result?.memberRole ??
          data?.data?.memberRole ??
          data?.member?.memberRole ??
          data?.memberRole ?? '';
        const roleStr = (Array.isArray(rawRole) ? rawRole.join(',') : String(rawRole)).toUpperCase();

        let norm: 'ADMIN' | 'BLACKLIST' | 'USER' = 'USER';
        if (roleStr.includes('BLACKLIST')) norm = 'BLACKLIST';
        if (roleStr.includes('ADMIN') || roleStr.includes('ROLE_ADMIN')) norm = 'ADMIN';

        try { localStorage.setItem('memberRole', norm); } catch {}
        setAdmin(norm === 'ADMIN'); setAuthed(true);
        return;
      } catch {
        // 네트워크 오류면 다음 후보
      }
    }
  }

  // 공용 동기화 헬퍼
  const syncAuth = () => {
    evaluateAuthFromLocal();
    void verifyRoleFromServerIfNeeded();
  };

  useEffect(() => {
    syncAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (['accessToken', 'access_token', 'refreshToken', 'memberRole', 'memberId', 'loginId'].includes(e.key || '')) {
        syncAuth();
      }
    };
    const onFocus = () => { syncAuth(); };
    const onAuthChanged = () => { syncAuth(); }; // 로그인 페이지에서 쏘는 커스텀 이벤트 대응

    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    window.addEventListener('auth-changed', onAuthChanged as EventListener);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('auth-changed', onAuthChanged as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    const base =
      process.env.NEXT_PUBLIC_API_BASE ||
      (typeof window !== 'undefined'
        ? window.location.origin.replace(':3000', ':8000')
        : '');

    // 서버 세션/토큰 정리: 실패해도 넘어가도록 allSettled
    try {
      await Promise.allSettled([
        fetch(new URL('/jwt/logout', base), {
          method: 'POST',
          credentials: 'include',
          headers: authHeaders(),
        }),
        fetch(new URL('/member/logout', base), {
          method: 'POST',
          credentials: 'include',
          headers: authHeaders(),
        }),
      ]);
    } catch {}

    // 로컬 인증 흔적 정리 + 헤더 상태 반영
    clearLocalAuth();
    setMyOpen(false);
    setSysOpen(false);
    setAuthed(false);
    setAdmin(false);

    try { window.dispatchEvent(new Event('auth-changed')); } catch {}

    router.replace('/');
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
        window.location.replace('/');
      }
    }, 50);
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
              {/* 비로그인: JOIN | LOGIN */}
              <Link href="/member/signup">JOIN</Link>
              <span className="sep">|</span>
              <Link href="/member/login">LOGIN</Link>
            </>
          ) : admin ? (
            <>
              {/* 관리자: MYPAGE(단일 링크 → INFO) | USER | SALES | INV | LOGOUT */}
              <Link href="/member/info" className="btn-link">MYPAGE</Link>
              <span className="sep">|</span>
              <Link href="banner" className="btn-link">BANNER</Link>
              <span className="sep">|</span>
              <Link href="/member/list" className="btn-link">USERS</Link>
              <span className="sep">|</span>
              <Link href="order/admin/erp" className="btn-link">SALES</Link>
              <span className="sep">|</span>
              <Link href="order/admin/inv" className="btn-link">INVENTORY</Link>
              <span className="sep">|</span>
               
              <button type="button" className="btn-link" onClick={handleLogout}>
                LOGOUT
              </button>
            </>
          ) : (
            <>
              {/* 일반 사용자: MYPAGE(드롭: INFO, ORDER, DEL) | CART | LOGOUT */}
              <div
                className="dropdown"
                ref={myRef}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMyOpen((v) => !v);
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
                    <Link href="/order/history" className="dropdown-item" role="menuitem" onClick={() => setMyOpen(false)}>
                      ORDER
                    </Link>
                    <Link href="/member/delete" className="dropdown-item" role="menuitem" onClick={() => setMyOpen(false)}>
                      DEL
                    </Link>
                  </div>
                )}
              </div>

              <span className="sep">|</span>
              <Link href="/cart" className="btn-link">CART</Link>
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
        <NavLink href="/board/FREE">CMNTY</NavLink>

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
