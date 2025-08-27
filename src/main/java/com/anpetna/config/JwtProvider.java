package com.anpetna.config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Component
public class JwtProvider {

    // ==========================
    // Secrets (환경변수/설정 주입)
    // ==========================
    @Value("${jwt.access-secret}")
    private String accessSecret;     // Access 서명 키(최소 32바이트 권장: 256bit)
    @Value("${jwt.refresh-secret}")
    private String refreshSecret;    // Refresh 서명 키(Access와 반드시 다르게)

    // ==========================
    // Keys (서명 키 객체)
    // ==========================
    private Key accessKey()  { return Keys.hmacShaKeyFor(accessSecret.getBytes(StandardCharsets.UTF_8)); }
    private Key refreshKey() { return Keys.hmacShaKeyFor(refreshSecret.getBytes(StandardCharsets.UTF_8)); }

    // ==========================
    // Expiry (유효기간)
    // ==========================
    private final long accessTokenValidity  = 1000L * 60 * 15;      // Access: 15분
    private final long refreshTokenValidity = 1000L * 60 * 60 * 24; // Refresh: 1일 (예: 운영에서 7~14일도 흔함)

    // =========================================================
    // Create Tokens (발급) — 인증용은 Access, 재발급용은 Refresh
    // =========================================================

    /** Access 토큰 발급(roles 없이) — 리소스 접근 인증에만 사용 */
    public String createAccessToken(String memberId) {
        return Jwts.builder()
                .setSubject(memberId)                                   // 주체: memberId
                .setIssuedAt(new Date())                                // iat(발급시각)
                .setExpiration(new Date(System.currentTimeMillis() + accessTokenValidity)) // exp
                .signWith(accessKey())                                   // Access 키로 서명
                .compact();
    }

    /** Access 토큰 발급(roles 포함) — 권한을 토큰에 싣고 싶을 때 */
    public String createAccessToken(String memberId, Collection<Integer> roles) {
        return Jwts.builder()
                .setSubject(memberId)
                .claim("roles", roles)                                   // 사용자 권한 클레임
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + accessTokenValidity))
                .signWith(accessKey())
                .compact();
    }

    /** Refresh 토큰 발급(roles 없이) — 재발급(회전) 용도 전용, 인증에 사용 금지 */
    public String createRefreshToken(String memberId) {
        return Jwts.builder()
                .setSubject(memberId)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + refreshTokenValidity))
                .signWith(refreshKey())                                   // Refresh 키로 서명
                .compact();
    }

    /** Refresh 토큰 발급(roles 포함) — 굳이 필요 없으면 roles 없이 쓰셔도 됩니다 */
    public String createRefreshToken(String memberId, Collection<Integer> roles) {
        return Jwts.builder()
                .setSubject(memberId)
                .claim("roles", roles)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + refreshTokenValidity))
                .signWith(refreshKey())
                .compact();
    }

    // =========================================================
    // Validation (검증) — 분리: Access 전용 / Refresh 전용
    // =========================================================

    /** Access 토큰 유효성(서명/만료) 검증 — 인증 필터에서 사용 */
    public boolean validateAccessToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(accessKey()).build().parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /** Refresh 토큰 유효성(서명/만료) 검증 — /refresh 엔드포인트에서만 사용 */
    public boolean validateRefreshToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(refreshKey()).build().parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    // ===================================================================================
    // Parsing (파싱 유틸) — Access 먼저 시도, 실패 시 Refresh 시도. (인증용이 아닌 보조용)
    // 만료(ExpiredJwtException)여도 Claims를 반환해서 exp/subject를 읽을 수 있게 함.
    // 블랙리스트 저장, 로깅/감사 용도로만 사용. 인증에는 절대 쓰지 마세요.
    // ===================================================================================
    public Claims parseClaimsFlexible(String token) {
        try {
            return Jwts.parserBuilder().setSigningKey(accessKey()).build()
                    .parseClaimsJws(token).getBody();
        } catch (ExpiredJwtException e) {
            return e.getClaims(); // Access 만료여도 Claims 반환
        } catch (JwtException e) {
            try {
                return Jwts.parserBuilder().setSigningKey(refreshKey()).build()
                        .parseClaimsJws(token).getBody();
            } catch (ExpiredJwtException ex) {
                return ex.getClaims(); // Refresh 만료여도 Claims 반환
            }
        }
    }

    // =========================================================
    // Subject/Expiration 유틸
    // =========================================================

    /** 인증용 subject 추출 — Access 키로만 파싱(Refresh 허용 X). 만료면 예외 → 401 처리 */
    public String getUsernameForAccess(String token) {
        return Jwts.parserBuilder().setSigningKey(accessKey()).build()
                .parseClaimsJws(token).getBody().getSubject();
    }

    /** 범용 subject 추출 — Access 실패 시 Refresh로도 시도(로깅/감사/블랙리스트 용) */
    public String getUsernameFlexible(String token) {
        return parseClaimsFlexible(token).getSubject();
    }

    /** Refresh 토큰의 만료 시각(Instant) */
    public Instant getRefreshExpiration(String refreshToken) {
        var c = Jwts.parserBuilder().setSigningKey(refreshKey()).build()
                .parseClaimsJws(refreshToken).getBody();
        return c.getExpiration().toInstant();
    }

    // =========================================================
    // Authentication (SecurityContext용) — Access 전용
    // =========================================================

    /** Access 토큰으로만 Authentication 생성 — 리소스 접근 인증에 사용 */
    public Authentication getAuthentication(String accessToken) {
        var claims = Jwts.parserBuilder().setSigningKey(accessKey()).build()
                .parseClaimsJws(accessToken).getBody();

        String memberId = claims.getSubject();
        Collection<? extends GrantedAuthority> authorities = toAuthorities(extractRoles(claims));

        UserDetails user = User.withUsername(memberId)
                .password("") // 사용하지 않음
                .authorities(authorities)
                .build();

        return new UsernamePasswordAuthenticationToken(user, "", user.getAuthorities());
    }

    // =========================================================
    // 내부 유틸: roles 추출/권한 매핑
    // =========================================================

    @SuppressWarnings("unchecked")
    private List<String> extractRoles(Claims claims) {
        Object raw = claims.get("roles");
        if (raw == null) return List.of();
        if (raw instanceof Collection<?> col) {
            return col.stream().map(String::valueOf).collect(Collectors.toList());
        }
        // 단일 문자열로 오는 경우 대비
        return List.of(String.valueOf(raw));
    }

    private Collection<? extends GrantedAuthority> toAuthorities(Collection<String> roles) {
        if (roles == null) return List.of();
        return roles.stream()
                .filter(Objects::nonNull)
                .map(r -> r.startsWith("ROLE_") ? r : "ROLE_" + r)
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toUnmodifiableList());
    }

    // =========================================================
    // [선택] 기존 코드 호환용 Deprecated 래퍼
    //  - 프로젝트 전체 리팩토링을 줄이고 점진 이행을 돕습니다.
    //  - 가능하면 점차 신규 메서드로 교체 권장.
    // =========================================================

    /** @deprecated Access 인증용은 createAccessToken(...)을 사용하세요. */
    @Deprecated
    public String createToken(String memberId, Collection<Integer> roles) {
        // 과거 'createToken'을 Access 발급으로 간주
        return createAccessToken(memberId, roles);
    }

    /** @deprecated 인증 필터에서는 validateAccessToken(...)만 쓰세요. */
    @Deprecated
    public boolean validateToken(String token) {
        // 과거 동작을 유지하되, 보안상 Access→Refresh 순으로 true 허용
        return validateAccessToken(token) || validateRefreshToken(token);
    }

    /** @deprecated 인증에서는 getUsernameForAccess(...)를 쓰세요. */
    @Deprecated
    public String getUsername(String token) {
        // 과거 getUsername이 Access→Refresh를 모두 허용했다면 보안 강화 위해 Access만
        return getUsernameForAccess(token);
    }

    /** @deprecated parseClaimsFlexible(...) 사용 권장 */
    @Deprecated
    public Claims parseClaims(String token) {
        return parseClaimsFlexible(token);
    }

    /** @deprecated 인증 필터에선 validateAccessToken으로 충분. */
    @Deprecated
    public void validateTokenOrThrow(String token) throws JwtException, IllegalArgumentException {
        if (!validateAccessToken(token)) {
            throw new JwtException("Invalid access token");
        }
    }
}
