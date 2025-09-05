// 역할 캐시 유틸: ADMIN이면 강화 기록, USER/미확정이면 기존값 보존(강등 금지)
import { readMemberOne, readMemberMe } from '@/features/member/data/member.api';

function normalizeRole(r: any): 'USER' | 'ADMIN' | 'BLACKLIST' {
  const v = (r ?? '').toString().trim().toUpperCase();
  if (v === '1' || v === 'ADMIN' || v === 'ROLE_ADMIN') return 'ADMIN';
  if (v === '2' || v === 'BLACKLIST' || v === 'ROLE_BLACKLIST') return 'BLACKLIST';
  return 'USER';
}

function pickRoleFrom(anyData: any): any {
  const d = anyData ?? {};
  return (
    d.memberRole ??
    d.role ??
    d?.dto?.memberRole ??
    d?.result?.memberRole ??
    d?.memberDTO?.memberRole ??
    d?.data?.memberRole ??
    d?.data?.role
  );
}

async function tryFetchRole(memberId?: string): Promise<'USER' | 'ADMIN' | 'BLACKLIST' | null> {
  try {
    const me = memberId && memberId.trim()
      ? await readMemberOne(memberId)
      : await readMemberMe(); // id 없으면 '/member/readOne' 사용
    const raw = pickRoleFrom(me);
    if (raw == null) return null;
    return normalizeRole(raw);
  } catch (e) {
    console.warn('[cacheMemberRole] readMember failed:', e);
    return null;
  }
}

export async function cacheMemberRole(memberId?: string) {
  // 1차 시도
  let norm = await tryFetchRole(memberId);

  // 네트워크/쿠키 지연 가드 한 번 더
  if (!norm) {
    await new Promise((r) => setTimeout(r, 200));
    norm = await tryFetchRole(memberId);
  }

  if (norm === 'ADMIN') {
    // ✅ 관리자 확정 → 강화 기록
    localStorage.setItem('memberRole', 'ADMIN');
    window.dispatchEvent(new Event('auth-changed'));
    console.log('[cacheMemberRole] set ADMIN');
  } else if (norm === 'BLACKLIST') {
    console.log('[cacheMemberRole] BLACKLIST detected (no local write by default)');
  } else {
    // ❗ USER/미확정: 기존값 유지 (강등 금지)
    const prev = localStorage.getItem('memberRole') ?? '(unset)';
    console.warn('[cacheMemberRole] role not determined or USER, keeping previous memberRole =', prev);
  }
}
