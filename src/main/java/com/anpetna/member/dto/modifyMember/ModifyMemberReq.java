package com.anpetna.member.dto.modifyMember;

import com.anpetna.member.constant.MemberRole;
import com.anpetna.member.dto.MemberDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ModifyMemberReq {

    private String memberName;//이름
    private String memberId;//아이디
    private String memberPw;//비밀번호
    private String memberEmail;//이메일
    private String memberPhone;//전화번호
    private String memberRoadAddress;//주소
    private String memberZipCode;//우편번호
    private String memberHasPet;//반려동물유무

    private List memberFileImage;//프로필 사진 이름

    private String etc;
}
