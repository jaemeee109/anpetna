package com.anpetna.config;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
@Component
public class JwtProvider {
    // 고정 시크릿을 환경에서 주입
    @Value("${jwt.access-secret}")
    String accessSecret;   // Access 토큰 서명용 시크릿
    @Value("${jwt.refresh-secret}")
    String refreshSecret;  // Refresh 토큰 서명용 시크릿

    // 토큰 종류별 키
    private Key accessKey()  { return Keys.hmacShaKeyFor(accessSecret.getBytes(StandardCharsets.UTF_8)); }
    private Key refreshKey() { return Keys.hmacShaKeyFor(refreshSecret.getBytes(StandardCharsets.UTF_8)); }

    // 만료 시간
    private final long accessTokenValidity = 1000 * 60 * 15;        // 15분
    private final long refreshTokenValidity = 1000L * 60 * 60 * 24; // 1일
    // :흰색_확인_표시: 문제였던 생성자 제거
    // 이전 코드에서 단일 key로 파서를 만들던 생성자가 있었는데,
    // 지금은 access/refresh 키가 분리되어 있으므로 생성자 주입을 쓰지 않습니다.
    // 필드 @Value로 주입되며, 각 메서드에서 해당 키로 파서를 생성합니다.

    // Access 토큰 생성
    public String createAccessToken(String username) {
        return Jwts.builder()
                .setSubject(username)
                .setExpiration(new Date(System.currentTimeMillis() + accessTokenValidity))
                .signWith(accessKey()) // accessKey로 서명
                .compact();
    }
    // Refresh 토큰 생성
    public String createRefreshToken(String username) {
        return Jwts.builder()
                .setSubject(username)
                .setExpiration(new Date(System.currentTimeMillis() + refreshTokenValidity))
                .signWith(refreshKey()) // refreshKey로 서명
                .compact();
    }

    // 토큰에서 subject 추출: Access → 실패 시 Refresh로 재시도
    public String getUsername(String token) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(accessKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody()
                    .getSubject();
        } catch (JwtException e) {
            return Jwts.parserBuilder()
                    .setSigningKey(refreshKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody()
                    .getSubject();
        }
    }

    // 엄격 검증: Access → 실패 시 Refresh로 재시도
    public void validateTokenOrThrow(String token) throws JwtException, IllegalArgumentException {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(accessKey())
                    .build()
                    .parseClaimsJws(token);
        } catch (JwtException e1) {
            Jwts.parserBuilder()
                    .setSigningKey(refreshKey())
                    .build()
                    .parseClaimsJws(token); // 여기서 발생한 예외는 그대로 밖으로
        }
    }

    // boolean 검증: Access → 실패 시 Refresh로 재시도
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(accessKey()).build().parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e1) {
            try {
                Jwts.parserBuilder().setSigningKey(refreshKey()).build().parseClaimsJws(token);
                return true;
            } catch (JwtException | IllegalArgumentException e2) {
                return false;
            }
        }
    }

    // Claims 파싱: 만료 포함 처리 + 키 이중 시도
    public Claims parseClaims(String token) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(accessKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        } catch (ExpiredJwtException e) {
            return e.getClaims(); // 만료여도 Claims 반환 (Access 경로)
        } catch (JwtException e) {
            try {
                return Jwts.parserBuilder()
                        .setSigningKey(refreshKey())
                        .build()
                        .parseClaimsJws(token)
                        .getBody();
            } catch (ExpiredJwtException ex) {
                return ex.getClaims(); // 만료여도 Claims 반환 (Refresh 경로)
            }
        }
    }
}