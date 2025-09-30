package com.anpetna.auth.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonPOJOBuilder;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonDeserialize(builder = TokenResponse.TokenResponseBuilder.class)
public class TokenResponse {
    private String accessToken;
    private String refreshToken;

    private String memberRole;

    @JsonPOJOBuilder(withPrefix = "")
    public static class TokenResponseBuilder {}
}
