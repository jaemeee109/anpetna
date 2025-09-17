package com.anpetna.auth.dto;

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
