package com.anpetna.member.dto.logout;

import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LogoutMemberReq {

    private String token;
}
