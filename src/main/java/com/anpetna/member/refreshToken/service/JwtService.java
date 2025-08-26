package com.anpetna.member.refreshToken.service;

import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.dto.loginMember.LoginMemberReq;
import com.anpetna.member.refreshToken.dto.LoginRequest;
import com.anpetna.member.refreshToken.dto.TokenRequest;
import com.anpetna.member.refreshToken.dto.TokenResponse;
import com.anpetna.member.refreshToken.entity.TokenEntity;

public interface JwtService {
    TokenResponse login(LoginMemberReq loginMemberReq);
    TokenResponse refresh(TokenRequest tokenRequest);
    void logout(TokenRequest tokenRequest);
}
