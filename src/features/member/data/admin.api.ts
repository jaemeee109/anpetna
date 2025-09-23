// src/features/member/data/admin.api.ts
import http, { getAccessToken } from '@/shared/data/http';

/** Admin 페이지 행 DTO (백엔드 AdminPageDTO와 1:1) */
export interface AdminMemberRow {
  memberId: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'BLACKLIST';
  phone?: string; // 백엔드 패치 적용 시 내려옵니다(아래 3) 참고)
}

/** 프로젝트 표준 PageResponseDTO 호환 타입 */
export interface PageRes<T> {
  dtoList: T[];
  page: number;
  size: number;
  total: number;
  start?: number;
  end?: number;
  prev?: boolean;
  next?: boolean;
}


/** 회원 목록 (검색/페이징) - GET /adminPage/AllMembers */
export async function listAdminMembers(params: { q?: string; page?: number; size?: number }) {
  const { q, page = 1, size = 10 } = params || {};
  const trimmed = (q ?? '').trim();

  const queryParams: Record<string, any> = {
    page: Math.max(0, page - 1),
    size,
  };
  if (trimmed !== '') {
    // ✅ 서버가 받는 공식 파라미터명만 전송
    queryParams.searchKeyword = trimmed;
  }

  const resp = await http.get('/adminPage/AllMembers', { params: queryParams });
  return resp.data?.result as PageRes<AdminMemberRow>;
}





// 관리자 권한 부여 - POST /adminPage/members/{memberId}/grant-admin
export async function grantAdmin(memberId: string) {
  await http.post(`/adminPage/members/${encodeURIComponent(memberId)}/grant-admin`);
}

// 관리자 권한 해제(ADMIN→USER) - POST /adminPage/members/{memberId}/revoke-admin
export async function revokeAdmin(memberId: string) {
  await http.post(`/adminPage/members/${encodeURIComponent(memberId)}/revoke-admin`);
}


/** 블랙리스트 등록 - POST /adminPage/create/blacklist (body: {memberId,reason,duration}) */
export async function createBlacklist(opts: { memberId: string; reason?: string; duration?: string }) {
  const { memberId, reason = '관리자 지정', duration = 'INDEFINITE' } = opts;
  await http.post('/adminPage/create/blacklist', { memberId, reason, duration });
}


/** 블랙리스트 해제(활성 전체 비활성화 + ROLE=USER 복귀) */
export async function deleteActiveBlacklist(memberId: string) {
  await http.post(`/adminPage/blacklist/active/${encodeURIComponent(memberId)}/deactivate`);
}


// 블랙 리스트 기간
export async function applyRole(
  memberId: string,
  target: 'USER' | 'ADMIN' | 'BLACKLIST',
  term?: 'D3' | 'D5' | 'D7' | 'INDEFINITE'
) {
  if (target === 'ADMIN') {
    await deleteActiveBlacklist(memberId);
    await grantAdmin(memberId);
    return;
  }
  if (target === 'USER') {
    await revokeAdmin(memberId);
    await deleteActiveBlacklist(memberId);
    return;
  }
  // BLACKLIST
  await createBlacklist({ memberId, duration: term ?? 'INDEFINITE' });
}

