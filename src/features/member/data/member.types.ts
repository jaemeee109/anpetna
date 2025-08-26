// features/member/data/member.types.ts

// 백엔드 enum이 무엇이든 받아주기 위해 관대한 타입으로 선언
export type MemberRole =
  | 'USER' | 'ADMIN'
  | 'ROLE_USER' | 'ROLE_ADMIN'
  | (string & {}); // 서버가 다른 문자열을 줄 경우도 통과

export interface MemberImage {
  uuid?: number | string;
  fileName?: string;
  url?: string;
  sortOrder?: number;
}

export interface Member {
  memberId: string;
  memberPw?: string;
  memberName: string;
  memberBirthY: string;
  memberBirthM: string;
  memberBirthD: string;
  memberBirthGM: string;     // 양/음력
  memberGender: string;
  memberHasPet: string;
  memberPhone: string;
  smsStsYn: string;          // 문자수신 여부
  memberEmail: string;
  emailStsYn: string;        // 이메일 수신 여부
  memberRoadAddress: string;
  memberZipCode: string;
  memberDetailAddress: string;
  memberRole: MemberRole;
  memberSocial?: boolean;    // 엔티티는 boolean, DTO는 social 이름일 수도 있어 optional
  memberEtc?: string;

  images?: MemberImage[];    // 프로필 이미지들

  // BaseEntity
  createDate?: string;
  latestDate?: string;

  // DTO 호환(서버가 다른 이름을 줄 수 있어 보조 필드)
  social?: boolean;
  etc?: string;
  memberFileImage?: Array<string | MemberImage>;
}

export type ReadMemberAllRes = Member[];
export interface ReadMemberOneRes extends Member {}

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
  memberSocial?: boolean;
  memberEtc?: string;
  // DTO 호환
  social?: boolean;
  etc?: string;
}

export type JoinMemberRes = {
  memberId: string;
};

export type ModifyMemberReq = Partial<Omit<Member, 'memberId'>> & { memberId: string };
export type ModifyMemberRes = Member;

export interface LoginReq {
  memberId: string;
  memberPw: string;
}
export interface LoginRes {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string; // Bearer 등
  // 서버가 다른 키로 줄 수도 있어 보조 키들
  token?: string;
  jwt?: string;
  memberId?: string;
}

export interface DeleteMemberRes {
  memberId?: string;
  success?: boolean;
  message?: string;
}
