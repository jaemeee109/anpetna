// features/member/utils/memberRole.ts
import { readMemberOne } from '@/features/member/data/member.api';

function normalizeRole(r: any): 'USER' | 'ADMIN' | 'BLACKLIST' {
  const v = (r ?? '').toString().trim().toUpperCase();
  if (v === '1' || v === 'ADMIN' || v === 'ROLE_ADMIN') return 'ADMIN';
  if (v === '2' || v === 'BLACKLIST' || v === 'ROLE_BLACKLIST') return 'BLACKLIST';
  return 'USER';
}

// 응답 객체에서 role 필드 베스트 에포트로 뽑기
function pickRoleFrom(anyData: any): any {
  const d = anyData ?? {};
  return (
    d.memberRole ?? d.role ?? d?.dto?.memberRole ?? d?.result?.memberRole ??
    d?.memberDTO?.memberRole ?? d?.data?.memberRole ?? d?.data?.role
  );
}

async function tryFetchRole(memberId: string): Promise<'USER'|'ADMIN'|'BLACKLIST'|null> {
  try {
    const me = await readMemberOne(memberId);
    // 콘솔 확인용 로그 (필요 없으면 지워도 무방)
    console.log('[cacheMemberRole] readMemberOne:', me);

    const raw = pickRoleFrom(me);
    if (raw == null) return null;
    return normalizeRole(raw);
  } catch (e) {
    console.warn('[cacheMemberRole] readMemberOne failed:', e);
    return null;
  }
}

export async function cacheMemberRole(memberId: string) {
  // 1차 시도
  let norm = await tryFetchRole(memberId);

  // 토큰/쿠키 전파 타이밍 문제 대비 300ms 후 재시도
  if (!norm) {
    await new Promise(r => setTimeout(r, 300));
    norm = await tryFetchRole(memberId);
  }

  if (norm) {
    const code = norm === 'ADMIN' ? '1' : norm === 'BLACKLIST' ? '2' : '0';
    localStorage.setItem('memberRole', code);
    localStorage.setItem('memberRoleName', norm);
    window.dispatchEvent(new Event('auth-changed'));
    console.log('[cacheMemberRole] set:', { code, norm });
  } else {
    // ❗ 중요: 실패 시 기존 값을 보존하고 경고만 출력 (0으로 덮어쓰지 않음)
    console.warn('[cacheMemberRole] role not determined, keeping previous memberRole =', localStorage.getItem('memberRole'));
  }
}
