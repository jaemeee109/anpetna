package com.anpetna.config;
import com.anpetna.auth.service.BlacklistServiceImpl;
import com.anpetna.auth.dto.TokenRequest;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtProvider jwtProvider;
    private final BlacklistServiceImpl blacklistService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            chain.doFilter(request, response);                      // 토큰 없음 → 익명으로 통과
            return;
        }
        String token = header.substring(7);
        TokenRequest tokenRequest = TokenRequest.builder()
                .accessToken(token)
                .build();
        // 2) [중요] 블랙리스트 먼저 확인 → 로그아웃/폐기 토큰 즉시 차단
        if (blacklistService.isBlacklisted(tokenRequest)) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token is revoked");
            return;
        }
        // JwtAuthenticationFilter.java
        try {
            jwtProvider.validateTokenOrThrow(token);
            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                String username = jwtProvider.getUsername(token);
                List<GrantedAuthority> authorities = new ArrayList<>();
                var authentication = new UsernamePasswordAuthenticationToken(username, null, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
            chain.doFilter(request, response);
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            // :느낌표:만료 토큰은 여기서 막지 말고 컨트롤러까지 보내서 /jwt/refresh에서 처리
            chain.doFilter(request, response);
        } catch (io.jsonwebtoken.JwtException e) {
            // 서명 불일치/변조/형식 오류 등 진짜 잘못된 토큰만 401
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token");
        }
    }
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        // 리프레시/로그아웃 같은 엔드포인트는 검증하지 않고 컨트롤러로 바로 보냄
        return uri.startsWith("/jwt/");
    }
}