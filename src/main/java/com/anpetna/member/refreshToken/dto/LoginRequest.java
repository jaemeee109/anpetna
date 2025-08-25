package com.anpetna.member.refreshToken.dto;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {
    private String memberId;
    private String memberPw;
}
