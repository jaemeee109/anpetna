package com.anpetna.config;

import com.anpetna.auth.service.BlacklistServiceImpl;
import com.anpetna.auth.dto.TokenRequest;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.constant.MemberRole; // enum: ACTIVE / BLACKLISTED
import com.anpetna.member.repository.MemberRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtProvider jwtProvider;
    private final BlacklistServiceImpl blacklistService;   // 토큰 블랙리스트(로그아웃 등)
    private final MemberRepository memberRepository;       // 사용자 상태(BLACKLISTED) 확인

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        // 0) Authorization 헤더 추출
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            // 토큰이 없으면 익명으로 다음 필터로
            chain.doFilter(request, response);
            return;
        }

        // 1) 토큰 파싱
        String access = header.substring(7);

        // 2) 블랙리스트(토큰) 선차단 — 로그아웃/폐기 토큰은 즉시 401
        TokenRequest tokenRequest = TokenRequest.builder().accessToken(access).build();
        if (blacklistService.isBlacklisted(tokenRequest)) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token is revoked");
            return;
        }

        try {
            // 3) Access 유효성(서명/만료) 검증 — 리프레시는 인증에 절대 사용 X
            if (!jwtProvider.validateAccessToken(access)) {
                // 유효하지 않으면 다음 필터로 넘김(보호된 자원이면 최종 401로 정리됨)
                chain.doFilter(request, response);
                return;
            }

            // 이미 컨텍스트에 인증이 없다면 주입
            if (SecurityContextHolder.getContext().getAuthentication() == null) {

                // 4) 사용자 상태 확인 — BLACKLISTED면 403
                String memberId = jwtProvider.getUsernameForAccess(access); // Access 전용 subject
                var status = memberRepository.findByMemberId(memberId)
                        .map(MemberEntity::getMemberRole)
                        .orElse(MemberRole.BLACKLIST); // 못 찾으면 보수적으로 차단
                if (status == MemberRole.BLACKLIST) {
                    response.sendError(HttpServletResponse.SC_FORBIDDEN, "User is blacklisted");
                    return;
                }

                // 5) SecurityContext에 인증 주입 — roles는 JWT의 roles 클레임으로 세팅됨
                var authentication = jwtProvider.getAuthentication(access);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }

            // 6) 다음 필터로
            chain.doFilter(request, response);

        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            // 만료 Access 토큰:
            // - 보호 자원 접근이면 최종적으로 401 처리됨
            // - /jwt/refresh 경로는 shouldNotFilter()로 이미 제외되어 컨트롤러에서 처리
            chain.doFilter(request, response);

        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException e) {
            // 서명/형식 문제 등 진짜 무효 토큰
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token");
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        // 리프레시/로그아웃 등 JWT 관리 엔드포인트는 필터 스킵 → 컨트롤러에서 처리
        return uri.startsWith("/jwt/");
    }
}
