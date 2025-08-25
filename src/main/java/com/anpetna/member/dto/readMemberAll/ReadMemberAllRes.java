package com.anpetna.member.dto.readMemberAll;

import com.anpetna.member.constant.MemberRole;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.dto.MemberDTO;
import com.anpetna.member.dto.readMemberOne.ReadMemberOneRes;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode
public class ReadMemberAllRes {

    private String memberId;//아이디
    private String memberName;//이름
    private String memberBirthY;//생일
    private String memberBirthM;
    private String memberBirthD;
    private String memberGender;//성별
    private String memberPhone;//전화번호
    private boolean social;//소셜로그인
    private String memberHasPet;//반려동물유무
    private MemberRole memberRole;//권한

    private static List<ReadMemberAllRes> member;

    public static ReadMemberAllRes fromEntity(MemberEntity memberEntity) {
        ReadMemberAllRes readMemberAllRes = new ReadMemberAllRes();

        readMemberAllRes.setMemberId(memberEntity.getMemberId());
        readMemberAllRes.setMemberName(memberEntity.getMemberName());
        readMemberAllRes.setMemberBirthY(memberEntity.getMemberBirthY());
        readMemberAllRes.setMemberBirthM(memberEntity.getMemberBirthM());
        readMemberAllRes.setMemberBirthD(memberEntity.getMemberBirthD());
        readMemberAllRes.setMemberGender(memberEntity.getMemberGender());
        readMemberAllRes.setMemberPhone(memberEntity.getMemberPhone());
        readMemberAllRes.setSocial(memberEntity.isMemberSocial());
        readMemberAllRes.setMemberHasPet(memberEntity.getMemberHasPet());

        return readMemberAllRes;
    }

    public static List<ReadMemberAllRes> from(List<MemberEntity> memberEntities) {
        ReadMemberAllRes readMemberAllRes = new ReadMemberAllRes();
        readMemberAllRes.member = memberEntities.stream().map(ReadMemberAllRes::fromEntity).toList();
        return member;
    }

}
