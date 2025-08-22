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
        // 1. JWT 추출
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            String token = header.substring(7);

            // ✅ 블랙리스트 체크
//            if (tokenBlacklistService.isBlacklisted(token)) {
//                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
//                return;
//            }

            if (jwtProvider.validate(token)) {// 2. JWT 유효성 확인
                // 3. Authentication 생성 (JWT payload에서 사용자 정보 복원)
                Authentication auth = jwtProvider.getAuthentication(token);
                // 4. SecurityContextHolder에 저장
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }
        chain.doFilter(request, response);
        //이후 컨트롤러, Interceptor, 서비스에서 바로 사용자 정보 접근 가능
    }
}
