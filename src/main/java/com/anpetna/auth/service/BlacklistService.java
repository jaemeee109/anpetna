package com.anpetna.auth.service;

import com.anpetna.auth.dto.TokenRequest;

public interface BlacklistService {

    // access 토큰을 블랙리스트에 추가
    void addToBlacklist(TokenRequest tokenRequest);

    // 토큰이 현재 블랙리스트에 살아있는지 확인
    boolean isBlacklisted(TokenRequest tokenRequest);

    // 만료된 블랙리스트 행 정리(수동 호출용)
    void purgeExpired();
}