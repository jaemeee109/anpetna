package com.anpetna.member.refreshToken.service;

public interface BlacklistService {

    // access 토큰을 블랙리스트에 추가
    void addToBlacklist(String accessToken);

    // 토큰이 현재 블랙리스트에 살아있는지 확인
    boolean isBlacklisted(String accessToken);

    // 만료된 블랙리스트 행 정리(수동 호출용)
    void purgeExpired();
}