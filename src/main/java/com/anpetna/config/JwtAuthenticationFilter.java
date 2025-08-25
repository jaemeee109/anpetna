package com.anpetna.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtProvider jwtProvider;
//    private final TokenBlacklistService tokenBlacklistService; // ✅ 블랙리스트 서비스

    public JwtAuthenticationFilter(JwtProvider jwtProvider) {
//        , TokenBlacklistService tokenBlacklistService
        this.jwtProvider = jwtProvider;
//        this.tokenBlacklistService = tokenBlacklistService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String uri = request.getRequestURI();
        String method = request.getMethod();

        // ✅ 프리플라이트(OPTIONS)는 인증 검사 없이 그냥 통과
        if ("OPTIONS".equalsIgnoreCase(method)) {
            chain.doFilter(request, response);
            return;
        }

        // ✅ 공개 엔드포인트는 토큰 검사 우회 (permitAll과 맞춤)
        // 프론트 개발 때문에 이부분 우회함
        if (("GET".equalsIgnoreCase(method) && uri.startsWith("/anpetna/board/"))
                || ("POST".equalsIgnoreCase(method) && uri.equals("/anpetna/board/"))
                || ("GET".equalsIgnoreCase(method) && uri.startsWith("/anpetna/comment/"))) {
            chain.doFilter(request, response); // 🔑 토큰 검사 건너뛰고 다음 필터로
            return;
        }

        // ✅ Authorization 헤더 검사
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            String token = header.substring(7);

            // ✅ 블랙리스트 체크 (나중에 사용)
            // if (tokenBlacklistService.isBlacklisted(token)) {
            //     response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            //     return;
            // }

            if (jwtProvider.validate(token)) {
                Authentication auth = jwtProvider.getAuthentication(token);
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        // 나머지는 기본적으로 계속 체인 수행
        chain.doFilter(request, response);
    }
}
