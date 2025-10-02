package com.anpetna.member.dto.deleteMember;

import lombok.*;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Setter
@Getter
public class DeleteMemberReq {

    private String memberId;
    private String currentPw; // 탈퇴확인용 비밀번호
}
