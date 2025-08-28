// features/member/data/member.types.ts

// --- 백엔드 enum(com.anpetna.member.constant.MemberRole) 대응 ---
// 현재 Enum 은 USER(0), ADMIN(1), BLACKLIST(2) 이고
// 서버에서 문자열("USER", "ADMIN", "BLACKLIST", "ROLE_*")을 줄 수도 있어
// 따라서 숫자/문자열 모두 대응하도록 정의
export type MemberRole =
  | 0 | 1 | 2                          // ORDINAL (DB 숫자값)
  | 'USER' | 'ADMIN' | 'BLACKLIST'     // 문자열 (EnumType.STRING 또는 수동 변환)
  | 'ROLE_USER' | 'ROLE_ADMIN'
  | (string & {}); // fallback

// --- 이미지(프로필) ---
export interface MemberImage {
  uuid?: number | string;
  fileName?: string;
  url?: string;
  sortOrder?: number;
}

// --- 회원 기본 모델 (백엔드 MemberDTO 필드 반영, 관대 모양) ---
export interface Member {
  // 식별 / 인증
  memberId: string;
  memberPw?: string;

  // 기본 정보
  memberName: string;

  // 생년월일(YYYY/MM/DD + 양/음력)
  memberBirthY: string;
  memberBirthM: string;
  memberBirthD: string;
  memberBirthGM: string; // '양력' | '음력'

  // 기타 특성
  memberGender: string;   // 'M' | 'F' | 'U' 등
  memberHasPet: string;   // 'Y' | 'N'

  // 연락
  memberPhone: string;
  smsStsYn: string;       // 'Y' | 'N'
  memberEmail: string;
  emailStsYn: string;     // 'Y' | 'N'

  // 주소
  memberRoadAddress: string;
  memberZipCode: string;
  memberDetailAddress: string;

  // 권한/소셜/비고
  memberRole: MemberRole;
  memberSocial?: boolean;
  memberEtc?: string;

  // 프로필 이미지 (백엔드: List memberFileImage)
  images?: MemberImage[];
  memberFileImage?: Array<string | MemberImage>;

  // 생성/수정 시간 (BaseEntity)
  createDate?: string;
  latestDate?: string;

  // 서버가 다른 키로 줄 수도 있어 보조 키들
  social?: boolean;
  etc?: string;

  // 백엔드 MemberDTO에 보일 수 있는 보조 필드들(관대 처리)
  status?: string;
  memberDTO?: Member;
}

// ---- 목록/단건 ----
export type ReadMemberAllRes = Member[];
export interface ReadMemberOneRes extends Member {}

// ---- 가입 ----
export interface JoinMemberReq {
  memberId: string;
  memberPw: string;
  memberName: string;

  memberBirthY: string;
  memberBirthM: string;
  memberBirthD: string;
  memberBirthGM: string;

  memberGender: string;
  memberHasPet: string;

  memberPhone: string;
  smsStsYn: string;

  memberEmail: string;
  emailStsYn: string;

  memberRoadAddress: string;
  memberZipCode: string;
  memberDetailAddress: string;

  memberRole: MemberRole;

  // 선택
  memberSocial?: boolean;
  memberEtc?: string;

  // 호환 키
  social?: boolean;
  etc?: string;
}
export type JoinMemberRes = { memberId: string };

// ---- 수정 ----
export type ModifyMemberReq = Partial<Omit<Member, 'memberId'>> & { memberId: string };
export type ModifyMemberRes = Member;

// ---- 로그인 ----
export interface LoginReq {
  memberId: string;
  memberPw: string;
}
export interface LoginRes {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string; // e.g. 'Bearer'
  // 서버가 다른 키로 줄 수도 있어 대비
  token?: string;
  jwt?: string;
  memberId?: string;
}

// ---- 삭제 ----
// 컨트롤러(import: com.anpetna.member.dto.deleteMember.DeleteMemberRes)에 맞춰 export
export interface DeleteMemberRes {
  memberId?: string;
  success?: boolean;
  message?: string;
  status?: string; // ApiResult 형태일 때를 대비해 관대 처리
}
