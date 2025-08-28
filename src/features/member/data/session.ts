// src/features/member/data/session.ts

type TokenPair = { accessToken?: string | null; refreshToken?: string | null };
function hasWindow() { return typeof window !== 'undefined'; }

const KEY_ACCESS = 'accessToken';
const KEY_REFRESH = 'refreshToken';
const KEY_MEMBER = 'memberId';

export const AuthStore = {
  isLoggedIn(): boolean {
    if (!hasWindow()) return false;
    return !!(localStorage.getItem(KEY_ACCESS) || localStorage.getItem(KEY_MEMBER));
  },
  memberId(): string | null {
    if (!hasWindow()) return null;
    return localStorage.getItem(KEY_MEMBER);
  },
  setMemberId(id: string) {
    if (!hasWindow()) return;
    localStorage.setItem(KEY_MEMBER, id);
  },
  setTokens(tokens: TokenPair) {
    if (!hasWindow()) return;
    const { accessToken, refreshToken } = tokens;
    if (accessToken != null) localStorage.setItem(KEY_ACCESS, accessToken);
    if (refreshToken != null) localStorage.setItem(KEY_REFRESH, refreshToken);
  },
  clear() {
    if (!hasWindow()) return;
    try {
      localStorage.removeItem(KEY_ACCESS);
      localStorage.removeItem(KEY_REFRESH);
      localStorage.removeItem(KEY_MEMBER);
    } catch {}
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

/**
 * 서버 로그아웃: 오직 /jwt/logout 만 호출
 * - redirect:'manual' 로 /login?logout 자동이동 차단
 * - 2xx/302/303 은 모두 성공 취급(스프링이 리다이렉트 줄 때 대비)
 */
export async function serverLogout(): Promise<void> {
  const url = apiURL('/jwt/logout'); // ✅ 단일 엔드포인트 고정
  try {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      redirect: 'manual',
    });
    if (res.ok || res.status === 302 || res.status === 303) {
      return;
    }
  } catch {
    // 네트워크 실패여도 클라이언트 정리는 아래에서 함
  }
}

/** 로컬 토큰/쿠키 제거 */
export function purgeAuthArtifacts() {
  AuthStore.clear();
}
