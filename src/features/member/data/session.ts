// features/member/data/session.ts
// 클라이언트 전용 유틸이지만, 'use client'는 필요 없습니다.
// (window 접근 전 안전 가드만 해주면 됨)

type TokenPair = { accessToken?: string | null; refreshToken?: string | null; };
function hasWindow() { return typeof window !== 'undefined'; }

const KEY_ACCESS = 'accessToken';
const KEY_REFRESH = 'refreshToken';
const KEY_MEMBER = 'memberId';

export const AuthStore = {
  /** 로그인 여부 */
  isLoggedIn(): boolean {
    if (!hasWindow()) return false;
    return !!(localStorage.getItem(KEY_ACCESS) || localStorage.getItem(KEY_MEMBER));
  },

  /** memberId 읽기 */
  memberId(): string | null {
    if (!hasWindow()) return null;
    return localStorage.getItem(KEY_MEMBER);
  },

  /** memberId 저장 */
  setMemberId(id: string) {
    if (!hasWindow()) return;
    localStorage.setItem(KEY_MEMBER, id);
  },

  /** 토큰 저장 */
  setTokens(tokens: TokenPair) {
    if (!hasWindow()) return;
    const { accessToken, refreshToken } = tokens;
    if (accessToken != null) localStorage.setItem(KEY_ACCESS, accessToken);
    if (refreshToken != null) localStorage.setItem(KEY_REFRESH, refreshToken);
  },

  /** 토큰/아이디 제거 + 쿠키 정리(가능한 범위) */
  clear() {
    if (!hasWindow()) return;

    try {
      localStorage.removeItem(KEY_ACCESS);
      localStorage.removeItem(KEY_REFRESH);
      localStorage.removeItem(KEY_MEMBER);
    } catch {}

    // 서버가 쿠키를 쓸 경우를 대비한 최소 정리(도메인/경로 조합별로 시도)
    try {
      const domains = ['', window.location.hostname];
      const paths = ['/', '/anpetna', '/member', '/jwt'];
      const cookieNames = ['accessToken', 'refreshToken', 'JSESSIONID', 'SESSION', 'Authorization'];

      const past = 'Thu, 01 Jan 1970 00:00:00 GMT';
      for (const name of cookieNames) {
        for (const d of domains) {
          for (const p of paths) {
            document.cookie =
              `${name}=; Expires=${past}; Path=${p};` +
              (d ? ` Domain=${d};` : '') +
              ' SameSite=Lax;';
          }
        }
      }
    } catch {}
  },
};
// 백엔드 베이스 URL (개발시 3000 → 8000 포트 전환 로직 포함)
function buildBase(): string {
  const env = process.env.NEXT_PUBLIC_API_BASE as string | undefined;
  if (env) return env.replace(/\/+$/, '');
  if (!hasWindow()) return '';
  const { protocol, hostname, port } = window.location;
  const usePort = port ? (port === '3000' ? '8000' : port) : '';
  return `${protocol}//${hostname}${usePort ? `:${usePort}` : ''}`;
}

const API_PREFIX = (process.env.NEXT_PUBLIC_API_PREFIX as string | undefined) ?? '/anpetna';
function apiURL(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${buildBase()}${API_PREFIX}${p}`;
}

/** 서버에 로그아웃 통보 (가능한 엔드포인트 후보 모두 시도) */
export async function serverLogout(): Promise<void> {
  const candidates = [apiURL('/jwt/logout'), apiURL('/member/logout')];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: 'POST', credentials: 'include' });
      if (res.ok) break; // 하나 성공하면 종료
    } catch {
      /* 다음 후보로 */
    }
  }
}

/** 로컬 토큰/쿠키 완전 제거 (Header에서 쓰는 이름 그대로 export) */
export function purgeAuthArtifacts() {
  AuthStore.clear();
}

// (원하면 이 줄도 추가해서 default로 AuthStore를 함께 제공)
// export default AuthStore;