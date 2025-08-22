package com.anpetna.member.dto.readMemberOne;

import com.anpetna.member.constant.MemberRole;
import com.anpetna.member.domain.MemberEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReadMemberOneRes {

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
    private boolean social;//소셜로그인
    private String memberHasPet;//반려동물유무
    private MemberRole memberRole;//권한

    private List memberFileImage;//프로필 사진 이름

    private String etc;

    public static ReadMemberOneRes from(MemberEntity memberEntity) {
        //MemberInfoResponse
        return ReadMemberOneRes.builder()
                .memberId(memberEntity.getMemberId())
                .memberName(memberEntity.getMemberName())
                .memberBirthY(memberEntity.getMemberBirthY())
                .memberBirthM(memberEntity.getMemberBirthM())
                .memberBirthD(memberEntity.getMemberBirthD())
                .memberBirthGM(memberEntity.getMemberBirthGM())
                .memberGender(memberEntity.getMemberGender())
                .memberEmail(memberEntity.getMemberEmail())
                .memberPhone(memberEntity.getMemberPhone())
                .memberRoadAddress(memberEntity.getMemberRoadAddress())
                .memberZipCode(memberEntity.getMemberZipCode())
                .social(memberEntity.isMemberSocial())
                .memberHasPet(memberEntity.getMemberHasPet())
                .memberRole(memberEntity.getMemberRole())
                .memberFileImage(memberEntity.getImages())
                .etc(memberEntity.getMemberEtc())
                .build();

    }

}
