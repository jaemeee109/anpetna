package com.anpetna.auth.controller;

import com.anpetna.config.JwtProvider;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.dto.loginMember.LoginMemberReq;
import com.anpetna.member.refreshToken.dto.TokenRequest;
import com.anpetna.member.refreshToken.dto.TokenResponse;
import com.anpetna.member.refreshToken.entity.TokenEntity;
import com.anpetna.member.refreshToken.service.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/jwt")
@RequiredArgsConstructor
public class JwtController {

    private final JwtService jwtService;

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@RequestBody LoginMemberReq loginMemberReq) {
        return ResponseEntity.ok(jwtService.login(loginMemberReq));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@RequestBody TokenRequest tokenRequest) {
        return ResponseEntity.ok(jwtService.refresh(tokenRequest));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(value="Authorization", required=false) String authorization,
                                       @RequestBody TokenResponse tokenResponse) {
        String access = clean(authorization);          // 위 clean() 재사용
        String refresh = clean(tokenResponse.getRefreshToken());

        TokenRequest tokenRequest = TokenRequest.builder()
                .accessToken(access)
                .refreshToken(refresh)
                .build();

        jwtService.logout(tokenRequest);
        return ResponseEntity.noContent().build(); //
    }

    private String clean(String token) {
        if (token == null) return null;
        token = token.trim();
        if (token.toLowerCase().startsWith("bearer ")) {
            return token.substring(7).trim();
        }
        return token;
    }
}
