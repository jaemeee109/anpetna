package com.anpetna.auth.service;

import com.anpetna.auth.dto.TokenRequest;
import com.anpetna.auth.repository.BlacklistedRepository;
import com.anpetna.auth.util.TokenHash;
import com.anpetna.auth.config.JwtProvider;
import com.anpetna.auth.domain.BlackListedEntity;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class BlacklistServiceImpl implements BlacklistService {

    private final BlacklistedRepository blacklistRepo;
    private final JwtProvider jwtProvider;
    private final TokenHash tokenHash;

    @Override
    public void addToBlacklist(TokenRequest tokenRequest) {

        // 1) 입력 방어: null/blank
        if (tokenRequest.getAccessToken() == null || tokenRequest.getAccessToken().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "액세스 토큰이 비었습니다.");
        }

        // 2) 파싱: 형식/서명 오류 → 400
        final Claims claims;
        try {
            // 만료된 토큰이어도 Claims 읽기 위해 parseClaims 사용 (형식/서명 오류만 예외로 간주)
            claims = jwtProvider.parseClaims(tokenRequest.getAccessToken());
        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 액세스 토큰 형식입니다.");
        }

        // 3) exp 검사: exp 없음 → 400
        var exp = claims.getExpiration();
        if (exp == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "만료 정보(exp)가 없는 토큰입니다.");
        }

        // 4) 이미 만료된 토큰 → 204 (등록 불필요)
        var expiresAt = exp.toInstant();
        var now = Instant.now();
        if (!expiresAt.isAfter(now)) {
            // 이미 만료된 토큰은 블랙리스트 저장 불필요하므로 바디 없이 정상 종료 시그널
            throw new ResponseStatusException(HttpStatus.NO_CONTENT);
        }

        // 5) 토큰 원문 해시화
        String accessHash = tokenHash.sha256(tokenRequest.getAccessToken());

        // 6) 중복 등록 방지: 아직 유효한 동일 해시가 있음 → 204 (신규 저장 없음)
        boolean exists = blacklistRepo.existsByAccessTokenHashAndExpiresAtAfter(accessHash, now);
        if (exists) {
            throw new ResponseStatusException(HttpStatus.NO_CONTENT);
        }

        // 7) 신규 저장
        var entity = new BlackListedEntity();
        entity.setAccessTokenHash(accessHash);
        entity.setExpiresAt(expiresAt);
        blacklistRepo.save(entity);
    }


    // 주어진 Access토큰이 현재 차단 상태인지 확인, 유효한 동일 해시가 존재하면 차단.
    @Override
    public boolean isBlacklisted(TokenRequest tokenRequest) {
        if (tokenRequest.getAccessToken() == null || tokenRequest.getAccessToken().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "액세스 토큰이 비었습니다.");
        }
        return blacklistRepo.existsByAccessTokenHashAndExpiresAtAfter(
                tokenHash.sha256(tokenRequest.getAccessToken()), Instant.now()
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
