package com.anpetna.auth.repository;

import com.anpetna.auth.domain.BlackListedEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;

public interface BlacklistedRepository extends JpaRepository<BlackListedEntity, Long> {

    // 블랙리스트에 남아있는 해시토큰이 아직 만료되지 않았는지 체크
    boolean existsByAccessTokenHashAndExpiresAtAfter(String accessTokenHash, Instant now);

    // 만료된 토큰을 주기적으로 삭제
    void deleteByExpiresAtBefore(Instant now);
}
