export type MemberDTO = {
  memberId: string;
  memberName: string;
  memberEmail: string;
  gender?: "M" | "F";
  phone?: string;
  createDate?: string;
};

export type LoginReq = { memberId: string; memberPw: string };
export type LoginRes = { accessToken: string; refreshToken?: string; expiresIn?: number };

export type SignupReq = {
  memberId: string;
  memberPw: string;
  memberName: string;
  memberEmail: string;
  memberBirthY?: string;
  memberBirthM?: string;
  memberBirthD?: string;
  memberGender?: "M" | "F";
  memberPhone?: string;
};
export type SignupRes = { member: MemberDTO };

export type ProfileRes = { member: MemberDTO };
export type UpdateMeReq = Partial<Omit<MemberDTO, "memberId">>;
export type UpdateMeRes = { member: MemberDTO };
