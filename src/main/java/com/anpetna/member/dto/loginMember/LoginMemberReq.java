package com.anpetna.member.dto.loginMember;

import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LoginMemberReq {

    private String memberId;
    private String memberPw;

}
