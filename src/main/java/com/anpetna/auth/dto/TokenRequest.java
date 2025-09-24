package com.anpetna.auth.dto;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonDeserialize(builder = TokenRequest.TokenRequestBuilder.class)
public class TokenRequest {
    private String refreshToken;
    private String accessToken;
}
