package com.anpetna.config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtProvider {

    private final SecretKey key;
    private final long accessTokenValidityMs;
    private final long refreshTokenValidityMs;
    private final UserDetailsService userDetailsService;

    public JwtProvider(
            @Value("${jwt.secret:change-me-please-change-me-please-change-me}") String secret,
            @Value("${jwt.expiration-ms:3600000}") long accessTokenValidityMs,
            @Value("${jwt.expiration-ms:3600000}") long refreshTokenValidityMs,
            UserDetailsService userDetailsService) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenValidityMs = accessTokenValidityMs;
        this.refreshTokenValidityMs = refreshTokenValidityMs;
        this.userDetailsService = userDetailsService;
    }

    // 🔑 Access Token 발급
    public String createAccessToken(Authentication authentication) {
        return buildToken(authentication.getName(), accessTokenValidityMs);
    }

    // 🔑 Refresh Token 발급
    public String createRefreshToken(Authentication authentication) {
        return buildToken(authentication.getName(), refreshTokenValidityMs);
    }

    private String buildToken(String subject, long validity) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + validity);

        return Jwts.builder()
                .setSubject(subject)
                .setIssuedAt(now)
                .setExpiration(exp)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean validate(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public Authentication getAuthentication(String token) {
        Claims claims = Jwts.parserBuilder().setSigningKey(key).build()
                .parseClaimsJws(token).getBody();

        UserDetails user = userDetailsService.loadUserByUsername(claims.getSubject());
        return new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
    }

    // 토큰에서 사용자 이름(아이디) 꺼내기
    public String getUsername(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build()
                .parseClaimsJws(token).getBody().getSubject();
    }

}

