package com.anpetna.jwt;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Objects;

/**
 * 테스트에서 로그인 과정을 생략하고 즉시 Access Token(JWT)을 발급하기 위한 유틸.
 * - 프로젝트 규약:
 *   - 사용자 식별자는 JWT의 subject(sub)에 저장
 *   - 헤더: Authorization: Bearer <token>
 *   - 알고리즘: HS256 (대칭키)
 */
public final class JwtTestsUtils {

    private JwtTestsUtils() {}

    /**
     * HS256으로 subject만 담긴 JWT를 발급한다.
     *
     * @param secret      application(-test).yml/properties의 jwt.secret 값 (32바이트 이상 권장)
     * @param subject     사용자 식별자(= username / memberId) -> JWT의 "sub"로 저장됨
     * @param ttlSeconds  만료까지의 초(예: 1800 = 30분)
     */
    public static String issueHs256SubjectToken(String secret, String subject, long ttlSeconds) {
        Objects.requireNonNull(secret, "secret must not be null");
        Objects.requireNonNull(subject, "subject must not be null");
        if (ttlSeconds <= 0) throw new IllegalArgumentException("ttlSeconds must be > 0");

        SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();

        return Jwts.builder()
                .setSubject(subject)                                  // ← 필터가 claims.getSubject()로 읽음
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusSeconds(ttlSeconds)))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Authorization 헤더 값 생성기 (접두사 공백 주의: "Bearer ").
     */
    public static String bearer(String jwt) {
        return "Bearer " + jwt;
    }
}
