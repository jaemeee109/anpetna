// features/member/data/session.ts
// 클라이언트 전용 유틸이지만, 'use client'는 필요 없습니다.
// (window 접근 전 안전 가드만 해주면 됨)

type TokenPair = {
  accessToken?: string | null;
  refreshToken?: string | null;
};

function hasWindow() {
  return typeof window !== 'undefined';
}

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
