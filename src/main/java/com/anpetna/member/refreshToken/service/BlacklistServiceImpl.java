package com.anpetna.member.refreshToken.service;

import com.anpetna.config.JwtProvider;
import com.anpetna.member.refreshToken.entity.BlackListedEntity;
import com.anpetna.member.refreshToken.repository.BlacklistedRepository;
import com.anpetna.member.refreshToken.util.TokenHash;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class BlacklistServiceImpl implements BlacklistService {

    private final BlacklistedRepository blacklistRepo;
    private final JwtProvider jwtProvider;
    private final TokenHash tokenHash;

    @Override
    public void addToBlacklist(String accessToken) {

        // 입력 방어 : null/blank 면 무시
        if (accessToken == null || accessToken.isBlank()) {
            return;
        }

        // 파싱: 형식이나 서명이 완전히 잘못된 토큰은 무시(블랙리스트 등록 불필요)
        Claims claims;
        try {
            claims = jwtProvider.parseClaims(accessToken); // 만료는 허용(Claims 읽기 목적)
        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException ex) {
            return;
        }

        // exp 방어: exp가 없거나(이상 케이스) 이미 만료된 토큰이면 저장하지 않음
        var exp = claims.getExpiration();
        if (exp == null) {
            return;
        }
        var expiresAt = exp.toInstant();
        var now = Instant.now();
        if (!expiresAt.isAfter(now)) {
            return; // 이미 만료 → 저장 불필요
        }

        // 토큰 원문을 해시 → DB에 해시만 저장
        String accessHash = tokenHash.sha256(accessToken);

        // 아직 유효한 동일 해시가 이미 등록돼 있으면 중복 저장 안 함
        boolean exists = blacklistRepo.existsByAccessTokenHashAndExpiresAtAfter(accessHash, now);

        // 신규 블랙리스트 레코드 저장(expires_at = AT.exp)
        if (!exists) {
            var entity = new BlackListedEntity();
            entity.setAccessTokenHash(accessHash);
            entity.setExpiresAt(expiresAt);
            blacklistRepo.save(entity);
        }
    }

    // 주어진 Access토큰이 현재 차단 상태인지 확인, 유효한 동일 해시가 존재하면 차단.
    @Override
    public boolean isBlacklisted(String accessToken) {
        if (accessToken == null || accessToken.isBlank()) {
            return false;
        }
        return blacklistRepo.existsByAccessTokenHashAndExpiresAtAfter(
                tokenHash.sha256(accessToken), Instant.now()
        );
    }

    // 만료된 블랙리스트를 주기적으로 청소
    // 매시 정각(주기 = 1시간)에 실행됨
    @Scheduled(cron = "0 0 * * * *")
    @Override
    public void purgeExpired() {
        blacklistRepo.deleteByExpiresAtBefore(Instant.now());
    }
}
