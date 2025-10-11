package com.anpetna.member.dto;

import com.anpetna.member.constant.MemberRole;
import com.anpetna.member.domain.MemberEntity;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;

import java.util.List;

@Data
@Builder
public class MemberDTO {

//    private Long memberIndex;
    private String status;
    private MemberDTO memberDTO;

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
    private String memberDetailAddress;
    private String memberZipCode;//우편번호
    private boolean social;//소셜로그인
    private String memberHasPet;//반려동물유무
    private MemberRole memberRole;//권한

    private List memberFileImage;//프로필 사진 이름

    private String etc;

    public static MemberEntity to(MemberDTO dto) {

        return MemberEntity.builder()
                .memberId(dto.getMemberId())
                .memberPw(dto.getMemberPw())
                .memberName(dto.getMemberName())
                .memberBirthY(dto.getMemberBirthY())
                .memberBirthM(dto.getMemberBirthM())
                .memberBirthD(dto.getMemberBirthD())
                .memberBirthGM(dto.getMemberBirthGM())
                .memberGender(dto.getMemberGender())
                .memberHasPet(dto.getMemberHasPet())
                .memberPhone(dto.getMemberPhone())
                // DTO에는 개별 수신동의/이메일인증 여부 필드가 없으므로 기본값 부여
                .smsStsYn("N")
                .memberEmail(dto.getMemberEmail())
                .emailStsYn("N")
                .memberRoadAddress(dto.getMemberRoadAddress())
                .memberDetailAddress(dto.getMemberDetailAddress())
                .memberZipCode(dto.getMemberZipCode())
                .memberRole(dto.getMemberRole() != null ? dto.getMemberRole() : MemberRole.USER)
                .memberSocial(dto.isSocial())
                .memberEtc(dto.getEtc())
                .build();
    }

    public static MemberDTO from(MemberEntity memberEntity) {

        return MemberDTO.builder()
                .status("success")
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
                .memberDetailAddress(memberEntity.getMemberDetailAddress())
                .memberZipCode(memberEntity.getMemberZipCode())
                .social(memberEntity.isMemberSocial())
                .memberHasPet(memberEntity.getMemberHasPet())
                .memberRole(memberEntity.getMemberRole())
                .memberFileImage(memberEntity.getImages())
                .etc(memberEntity.getMemberEtc())
                .build();
    }
}
