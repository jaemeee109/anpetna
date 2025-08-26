package com.anpetna.auth.controller;

import com.anpetna.auth.dto.LoginMemberReq;
import com.anpetna.auth.dto.TokenRequest;
import com.anpetna.auth.dto.TokenResponse;
import com.anpetna.auth.service.JwtService;
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
    public ResponseEntity<Void> logout(
            @RequestHeader(value="Authorization", required=false) String authorization,
            @RequestBody TokenRequest tokenRequest) {

        String access = clean(authorization);
        String refresh = clean(tokenRequest.getRefreshToken());

        TokenRequest req = TokenRequest.builder()
                .accessToken(access)
                .refreshToken(refresh)
                .build();

        jwtService.logout(req);
        return ResponseEntity.noContent().build();
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
