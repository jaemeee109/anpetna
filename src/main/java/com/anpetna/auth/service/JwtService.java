package com.anpetna.auth.service;

import com.anpetna.auth.dto.LoginMemberReq;
import com.anpetna.auth.dto.TokenResponse;

public interface JwtService {
    TokenResponse login(LoginMemberReq loginMemberReq);
    TokenResponse refresh(String refreshToken);
    void logout(String refreshToken, String accessToken);
}
