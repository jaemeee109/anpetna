package com.anpetna.member.dto.loginMember;

import com.anpetna.member.constant.MemberRole;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LoginMemberRes {

//    private String memberId;
//    private String memberPw;
    private String token;

}
