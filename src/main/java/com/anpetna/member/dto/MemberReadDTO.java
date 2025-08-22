package com.anpetna.member.dto;

import com.anpetna.member.domain.MemberEntity;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;

@Data
@Getter
public class MemberReadDTO {
    public static MemberDTO from(MemberEntity memberEntity) {
        //MemberInfoResponse
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
                .memberZipCode(memberEntity.getMemberZipCode())
                .social(memberEntity.isMemberSocial())
                .memberHasPet(memberEntity.getMemberHasPet())
                .memberRole(memberEntity.getMemberRole())
                .memberFileImage(memberEntity.getImages())
                .etc(memberEntity.getMemberEtc())
                .build();

    }
}
