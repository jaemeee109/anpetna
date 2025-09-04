package com.anpetna.auth.config;

import com.anpetna.auth.service.BlacklistServiceImpl;
import com.anpetna.auth.dto.TokenRequest;
import com.anpetna.member.constant.MemberRole;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ 전달사항 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    //return : return 없으면 아래 JWT 검증 로직까지 계속 실행되어 불필요하게 예외가 발생할 수 있음
    //다음 필터로 넘어가는 부분, 예외처리 부분에 로그처리 다 했습니다.
    //SecurityContextHolder 주입 로직에 dev/pro 구분해놓았으니 주석처리로 사용 부탁드립니다.
    //🔴➡️는 예외처리 경로이니 참고해주세요
    //validateAccessToken() boolean 수정 요함 → try-catch로 만료/위조 구분
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    private final JwtProvider jwtProvider;
    private final BlacklistServiceImpl blacklistService;   // 토큰 블랙리스트(로그아웃 등)
    private final MemberRepository memberRepository;       // 사용자 상태(BLACKLISTED) 확인

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws IOException, ServletException {

        // 1) Authorization 헤더 확인=======================================================
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            log.info("No Authorization header or missing Bearer: uri={}", request.getRequestURI());
            chain.doFilter(request, response);// 🔴➡️
            return;
        }

        // 토큰의 기본 구조 : Authorization: Bearer <JWT 토큰>
        //Bearer → 토큰 타입을 지정 (Bearer 토큰 = OAuth 2.0 권장 방식)
        //<JWT 토큰> → 실제 JWT 문자열 (헤더.페이로드.서명)
        //헤더 없음 → 익명 요청 //Bearer 누락 → 무효 처리

        // 토큰 파싱========================================================================
        String access = header.substring(7);
        TokenRequest tokenRequest = TokenRequest.builder().accessToken(access).build();
        try{

            // 2) 블랙리스트 토큰 체크=========================================================
            if (blacklistService.isBlacklisted(tokenRequest)) {//🔴➡️ 엑세스 토큰 비어있음
                log.warn("Blacklisted token attempt: uri={}, sub={}", request.getRequestURI(), safeSub(access));
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token is revoked");// 🔴➡️ 로그아웃/폐기 토큰은 즉시 401
                return;
            }


            // 3) Access 유효성(서명/만료) 검증==================================================
            if (!jwtProvider.validateAccessToken(access)) { // 리프레시는 인증에 절대 사용 X
                log.warn("JWT validation failed: uri={}, sub?={}", request.getRequestURI(), safeSub(access));
                chain.doFilter(request, response); // 🔴➡️ 만료/서명불일치/기타는 JwtProvider에서 구체적 로그
                return;
            }
            // Access Token 검증 관련 참고==================================================
            //Claims claims = jwtProvider.parseClaims(access); // 만료 시 ExpiredJwtException
            //log.debug("Access token valid: uri={}, sub={}", request.getRequestURI(), claims.getSubject());


            // memberId 검증=================================================================
            String memberId = jwtProvider.getUsernameForAccess(access);
            if (memberId == null || memberId.isBlank()) {
                log.warn("Missing subject in token: uri={}", request.getRequestURI());
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token: missing subject"); // 🔴➡️
                return;
            }
             /*보호 자원 접근 위험 : SecurityContext에 인증이 없거나 잘못된 상태로 요청이 들어갈 수 있음
                다음 필터나 컨트롤러에서 Authentication이 없거나 null이라 401/403 처리되긴 하지만, 불필요한 체인 진행과 보안상 리스크가 발생
                JWT 변조 가능성 : 변조된 토큰에서 null memberId가 들어올 수 있음 → 인증 우회 시도 가능*/


            // 4) SecurityContextHolder에 인증이 없다면 주입=====================================
            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                //dev~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                /*var roles = new ArrayList<GrantedAuthority>();
                roles.add(new SimpleGrantedAuthority("ROLE_USER"));
                var auth = new UsernamePasswordAuthenticationToken(memberId, null, roles);
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);*/
                //pro~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                MemberRole status = memberRepository.findByMemberId(memberId)
                        .map(MemberEntity::getMemberRole)
                        .orElse(MemberRole.BLACKLIST); // 못 찾으면 보수적으로 차단
                if (status == MemberRole.BLACKLIST) { // 블랙리스트(사용자) 차단
                    response.sendError(HttpServletResponse.SC_FORBIDDEN, "User is blacklisted");  // 🔴➡️
                    return;
                }
                // 5) SecurityContext에 인증 주입 — DB 기반 권한 부여
                Collection<? extends GrantedAuthority> authorities = List.of(
                        new SimpleGrantedAuthority(
                                status.name().startsWith("ROLE_") ? status.name() : "ROLE_" + status.name()
                        )
                );
                UserDetails user = User.withUsername(memberId)
                        .password("") // 사용 안함
                        .authorities(authorities)
                        .build();

                Authentication authentication =
                        new UsernamePasswordAuthenticationToken(user, "", authorities);
                SecurityContextHolder.getContext().setAuthentication(authentication);
                //end~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

            }
            chain.doFilter(request, response);

        } catch (ExpiredJwtException e) {// Access Token 만료 → Refresh API 처리
            log.info("Access token expired: uri={}, sub={}", request.getRequestURI(), safeSub(access));
            request.setAttribute("expiredJwt", e); //만료된 Access Token 정보를 컨트롤러로 전달
            chain.doFilter(request, response);// ➡️➡️

        } catch (JwtException | IllegalArgumentException e) {// 서명 위조, null 토큰 등 → 바로 401
            log.warn("Invalid access token: uri={}, error={}", request.getRequestURI(), e.getMessage());
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid access token");  // 🔴➡️
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri.startsWith("/jwt/");  // 리프레시/로그아웃 등 JWT 관리 엔드포인트는 필터 스킵 → 컨트롤러에서 처리
    }

    // payload에서 sub만 안전하게 추출 (로그용)
    private String safeSub(String jwt) {
        try {
            return jwtProvider.parseClaims(jwt).getSubject();
        } catch (Exception ignore) {
            return "?";
        }
    }
}