// src/components/layout/Header.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import venueApi from '@/features/venue/data/venue.api';
import NotificationBell from '@/components/layout/NotificationBell';

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
  try {
    // 토큰류
    localStorage.removeItem("accessToken");
    sessionStorage.removeItem("accessToken");
    localStorage.removeItem("access_token");
    sessionStorage.removeItem("access_token");
    localStorage.removeItem("Authorization");
    sessionStorage.removeItem("Authorization");

    // 사용자 아티팩트 전부 제거
    localStorage.removeItem("memberId");
    localStorage.removeItem("memberRole");
    localStorage.removeItem("loginId");   // 
    localStorage.removeItem("username");  // 

    // 쿠키 제거(Authorization 등)
    document.cookie = "Authorization=; Max-Age=0; path=/";
    document.cookie = "authorization=; Max-Age=0; path=/";
    document.cookie = "accessToken=; Max-Age=0; path=/";
  } catch {}
}
function dispatchAuthChanged() {
  try {
    window.dispatchEvent(new Event('auth-changed'));
  } catch {}
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

    const roleCheckInFlight = useRef(false);
  const lastRoleCheckAt = useRef<number>(0);

  // 드롭다운
  const [myOpen, setMyOpen] = useState(false);
  const [sysOpen, setSysOpen] = useState(false);     // ※ SYSTEM UI는 제거하지만 원본 흐름 보존
  const myRef = useRef<HTMLDivElement | null>(null);
  const sysRef = useRef<HTMLDivElement | null>(null); // ※ 동일

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

async function verifyRoleFromServerIfNeeded() {
  // 로그인 흔적 없으면 스킵
  if (!hasAnyLocalAuth()) return;

  // 10초 내 중복 호출 방지
  const now = Date.now();
  if (roleCheckInFlight.current || now - lastRoleCheckAt.current < 10_000) return;
  roleCheckInFlight.current = true;
  lastRoleCheckAt.current = now;

  try {
    const token = getTokenFromStorage();

    // JWT/로컬이 이미 ADMIN이면 서버 확인 생략
    const isAdminByJwt = token ? payloadHasAdmin(decodeJwt(token)) : false;
    const stored = (typeof window !== 'undefined' && localStorage.getItem('memberRole')) || '';
    const isAdminStored = (stored.toUpperCase() === 'ADMIN' || stored.toUpperCase() === 'ROLE_ADMIN');
    if (isAdminByJwt || isAdminStored) {
      setAuthed(true);
      setAdmin(true);
      return;
    }

    // 서버 조회 시도 (loginId or memberId가 문자열인 환경 고려)
    const id =
      (typeof window !== 'undefined' && (localStorage.getItem('memberId') || localStorage.getItem('loginId'))) || '';
    if (!id) {
      // 로컬 흔적만으로 표시
      setAuthed(!!token);
      setAdmin(false);
      return;
    }

    const base =
      process.env.NEXT_PUBLIC_API_BASE ||
      (typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':8000') : '');

    // 1순위 → my_page/{id}, 실패 시 readOne/{id}
    const candidates = [
      `member/my_page/${encodeURIComponent(id)}`,
      `member/readOne/${encodeURIComponent(id)}`,
    ];

    for (const p of candidates) {
      const url = new URL(p, base+'/');
      try {
        const r = await fetch(url.toString(), { credentials: 'include', headers: authHeaders() });

        // 401/403은 조용히 종료(다시 로그인 필요할 때만 UI가 자연히 유도됨)
        if (r.status === 401 || r.status === 403) return;

        // ❗ 500 계열이면 더 이상 다음 후보 호출하지 말고 종료
        if (r.status >= 500) return;

        if (!r.ok) {
          // 4xx지만 401/403이 아닌 경우 → 다음 후보로
          continue;
        }

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
        setAdmin(norm === 'ADMIN');
        setAuthed(true);
        return; // 성공했으면 종료
      } catch {
        // 네트워크 오류면 다음 후보
      }
    }

    // 모든 후보 실패 시: 토큰이 있으면 로그인 상태만 유지, 역할은 로컬 추정
    setAuthed(!!token);
    setAdmin(false);
  } finally {
    roleCheckInFlight.current = false;
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

function getRefreshTokenFromStorage(): string {
  try {
    // 1순위: localStorage
    const ls = localStorage.getItem('refreshToken') || '';
    if (ls) return ls;
    // 2순위: sessionStorage
    const ss = sessionStorage.getItem('refreshToken') || '';
    if (ss) return ss;
    // 3순위: 쿠키
    const m = document.cookie.match(/(?:^|;\s*)refreshToken=([^;]*)/);
    return m ? decodeURIComponent(m[1]) : '';
  } catch { return ''; }
}


function handleLogout() {
  try {
    clearLocalAuth();
    dispatchAuthChanged(); 
  } finally {
    //  모든 페이지에서 로그아웃 시 메인으로
    if (typeof window !== 'undefined') window.location.assign('/');
  }
}





  const helpActive =
    pathname === '/board/FAQ' ||
    pathname === '/board/QNA' ||
    pathname === '/board/Help' ||
    pathname?.startsWith('/board/FAQ/') ||
    pathname?.startsWith('/board/QNA/');

  /* -------------------- RESERVATION 드롭다운 상태/로더 -------------------- */
  const [rvOpen, setRvOpen] = useState(false);
  const [rvLoading, setRvLoading] = useState(false);
  const [rvErr, setRvErr] = useState<string | null>(null);
  const [venues, setVenues] = useState<{ venueId: number; venueName: string }[]>([]);

  async function ensureVenues() {
    if (venues.length > 0 || rvLoading) return;
    setRvLoading(true); setRvErr(null);
    try {
      const list = await venueApi.listVenues();
      setVenues(list);
    } catch (e: any) {
      setRvErr(e?.message || '매장 목록을 불러오지 못했습니다.');
    } finally {
      setRvLoading(false);
    }
  }

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
              {/* 관리자: MYPAGE(단일 링크 → INFO) | USER | SALES | INV | RESERVATION(드롭다운) | LOGOUT */}
            <NotificationBell />
            <span className="sep">|</span>
              <Link href="/member/info" className="btn-link">MYPAGE</Link>
              <span className="sep">|</span>
              <Link href="/banner" className="btn-link">BANNER</Link>
              <span className="sep">|</span>
              <Link prefetch={false} href="/member/list">USERS</Link>
              <span className="sep">|</span>
              <Link prefetch={false} href="/order/admin/erp">SALES</Link>
              <span className="sep">|</span>
              <Link prefetch={false} href="/order/admin/inv">INVENTORY</Link>
              <span className="sep">|</span>

             {/* RESERVATION 드롭다운 */}
            <div className="dropdown">
              <span
                className="btn-link dropdown-toggle"
                onClick={() => { setRvOpen(v => !v); if (!rvOpen) void ensureVenues(); }}
                aria-haspopup="menu"
                aria-expanded={rvOpen ? 'true' : 'false'}
              >
                RESERVATION
              </span>

              {rvOpen && (
                <div role="menu" className="dropdown-menu">
                  {rvLoading && (
                    <div className="dropdown-item" aria-disabled="true">불러오는 중…</div>
                  )}
                  {rvErr && (
                    <div className="dropdown-item" aria-disabled="true">{rvErr}</div>
                  )}
                  {!rvLoading && !rvErr && venues.map((v) => (
                    <Link
                      key={v.venueId}
                      href={`/care/admin?venueId=${v.venueId}`}
                      className="dropdown-item"
                      role="menuitem"
                      onClick={() => setRvOpen(false)}
                    >
                      {v.venueName}
                    </Link>
                  ))}
                  {!rvLoading && !rvErr && venues.length === 0 && (
                    <div className="dropdown-item" aria-disabled="true">매장이 없습니다</div>
                  )}
                </div>
              )}
            </div>


              <span className="sep">|</span>
              <button type="button" className="btn-link" onClick={handleLogout}>
                LOGOUT
              </button>
            </>
          ) : (
            <>
              {/* 일반 사용자: MYPAGE(드롭: INFO, ORDER, DEL) | CART | LOGOUT */}
             <NotificationBell />
              <span className="sep">|</span>
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
                    <Link href="/care/history" className="dropdown-item" role="menuitem" onClick={() => setMyOpen(false)}>
                      RESERVE
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
        <NavLink href="/care">CARE</NavLink>

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
            {/* ▼ CHAT: 비회원이면 경고 후 로그인으로, 관리자 분기 유지 */}
            <Link
              href={admin ? "/chat?forceAdmin=1" : "/chat"}
              className="dropdown-item"
              role="menuitem"
              prefetch={false}
              onClick={(e) => {
                const authed = !!(getTokenFromStorage() || getCookie('JSESSIONID'));
                if (!authed) {
                  e.preventDefault();
                  alert('회원만 이용이 가능합니다');
                  if (typeof window !== 'undefined') window.location.href = '/member/login';
                  return;
                }
                // 로그인 상태에서만 관리자 로컬 역할 스티칭(기존 동작 유지)
                if (admin) {
                  try { localStorage.setItem('memberRole', 'ADMIN'); } catch {}
                }
              }}
            >
              CHAT
            </Link>


          </div>
        </div>
      </nav>

      <div className="apn-divider" />
    </header>
  );
}
