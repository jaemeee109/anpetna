package com.anpetna.member.dto.joinMember;

import com.anpetna.member.constant.MemberRole;
import com.anpetna.member.dto.MemberDTO;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class JoinMemberReq {

    private String memberId;//아이디
    private String memberPw;//비밀번호
    private String memberName;//이름
    private String memberBirthY;//생일
    private String memberBirthM;
    private String memberBirthD;
    private String memberBirthGM;//양력,음력
    private String memberGender;//성별
    private String memberEmail;//이메일
    private String memberPhone;//전화번호
    private String memberRoadAddress;//주소
    private String memberZipCode;//우편번호
    private String memberDetailAddress;
    private boolean social;//소셜로그인
    private String memberHasPet;//반려동물유무
    private MemberRole memberRole;//권한
    private String emailStsYn;
    private String smsStsYn;

    private List memberFileImage;//프로필 사진 이름

    private String etc;

}
