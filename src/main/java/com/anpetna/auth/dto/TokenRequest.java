package com.anpetna.auth.dto;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenRequest {
    private String refreshToken;
    private String accessToken;
}
