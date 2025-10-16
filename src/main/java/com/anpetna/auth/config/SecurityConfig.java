package com.anpetna.auth.config;

import com.anpetna.adminPage.repository.AdminBlacklistJpaRepository;
import com.anpetna.auth.service.BlacklistServiceImpl;
import com.anpetna.config.WebConfig;
import com.anpetna.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.security.servlet.PathRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

// CRUD 개발시 @Configuration, @RequiredArgsConstructor 만 활성화
@Configuration
@RequiredArgsConstructor
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)                      // 메서드 단위 @PreAuthorize 등 사용
public class SecurityConfig {

    // CRUD 개발시 위에서부터 3개의 메서드만 활성화시킬 것
    //dev=============================================================
/*
    // JWT, 세션, 인증 전부 OFF -> security 적용할 떄에는 해당메서드 주석처리
/*   @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())                                        // CSRF 끄기 (Postman 테스트 시 필수)
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())    // 모든 요청 허용
                .formLogin(login -> login.disable())                            // 폼 로그인 끄기
                .httpBasic(basic -> basic.disable());                            // Basic Auth 끄기
        return http.build();
    }*/

    private final WebConfig webConfig;

    @Bean   // 스프링 기본 AuthenticationManager 노출
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration)
            throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean // Bcrypt 사용
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    //================================================================


    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http,
            JwtProvider jwtProvider,                               // JWT 파서/검증기
            BlacklistServiceImpl blacklistService,                 // Access 블랙리스트 조회 서비스
            CorsConfigurationSource corsConfigurationSource,       // CORS 설정 빈 (주입만 받음)
            AdminBlacklistJpaRepository adminBlacklistJpaRepository, // ★추가: 계정 블랙리스트
            MemberRepository memberRepository) throws Exception {
        http
                // ===== CORS / CSRF / 세션 전략 =====
                .cors(c -> c.configurationSource(corsConfigurationSource))        // CORS 활성화 + 아래 Bean 적용
                .csrf(csrf -> csrf.disable())                                     // JWT 사용 → CSRF 비활성
                .formLogin(f -> f.disable())                                 // 폼 로그인 미사용
                .httpBasic(b -> b.disable())                                  // 기본 인증 미사용
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // 세션 상태 없음

                // ===== 인가 규칙 =====
                .securityMatcher("/**")
                .authorizeHttpRequests(auth -> auth
                        //(보안 사용 시) 헬스엔드포인트 허용
                        .requestMatchers("/test", "/actuator/health", "/actuator/health/**", "/actuator/info").permitAll()

                        //브라우저에서 실제 요청 전에 보내는 프리플라이트 요청 -> 인증 없이 허용해주어야 브라우저에서 정상적으로 POST/PUT/DELETE 요청이 가능
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // --- Api Document ---
                        .requestMatchers(
                                "/v3/api-docs",
                                "/v3/api-docs/**",
                                "/swagger-ui.html",
                                "/swagger-ui/**",
                                "/swagger-resources/**",
                                "/webjars/**",
                                "/favicon.ico"

                        ).permitAll()

                        //  정적 리소스 전체 허용 (classpath:/static, /public, /resources, /META-INF/resources)
                        .requestMatchers(PathRequest.toStaticResources().atCommonLocations()).permitAll()

                        // WebSocket/STOMP 핸드셰이크 엔드포인트(예: /ws/**)
                        .requestMatchers("/ws/**", "/stomp/**").permitAll()

                        .requestMatchers("/notification/stream").authenticated()
                        // --- Auth/JWT ---
                        .requestMatchers("/jwt/**").permitAll()

                        // --- Toss Pay (API 개별 연동) ---
                        // 결제 준비/승인 API (백엔드가 토스 서버와 통신): 프론트에서 토큰 없이 호출 가능해야 함
                        .requestMatchers(HttpMethod.POST,
                                "/api/pay/toss/prepare",
                                "/api/pay/toss/confirm").permitAll()
                        // (선택) 클라이언트 키 핑/디버그용
                        .requestMatchers(HttpMethod.GET, "/api/pay/toss/client-key").permitAll()
                        // 성공/실패 리다이렉트(정적 HTML)도 누구나 접근 허용
                        .requestMatchers(HttpMethod.GET,
                                "/success.html",
                                "/fail.html",
                                "/toss-api-test.html").permitAll()







                        // --- Member (join/login 먼저 열기!) ---
                        .requestMatchers("/member/login", "/member/join").permitAll()
                        .requestMatchers("/member/readOne", "/member/readAll").hasRole("ADMIN")
                        .requestMatchers("/member/my_page/**", "/member/modify").hasAnyRole("ADMIN","USER")  // ✅ 슬래시 대신 /**


                        // --- Board ---
                        .requestMatchers(HttpMethod.GET, "/board/readAll").permitAll()
                        .requestMatchers(HttpMethod.GET, "/board/readOne/**").permitAll() // QNA 예외는 Guard 에서 처리
                        .requestMatchers(HttpMethod.POST, "/board/create").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.POST, "/board/update/**").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.POST, "/board/delete/**").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.POST, "/board/like/**").hasAnyRole("ADMIN", "USER")
                        // 여기서 GET 은 전부 permitAll 로 두고, QNA 의 로그인 필요/본인 제한은 Guard 에서 검사합니다.
                        // 이러면 리스트/상세에도 세밀한 제약(로그인 필요, 본인만 등)을 줄 수 있어요.

                        // --- Comment ---
                        .requestMatchers("/comment/**").hasAnyRole("ADMIN", "USER")

                        // --- Item & Review (순서 중요 / 수정금지 ) ---
                        .requestMatchers(HttpMethod.GET, "/item/**").permitAll()

                        .requestMatchers(HttpMethod.POST, "/item/*/review").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.PUT, "/item/*/review/*").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.DELETE, "/item/*/review/*").hasAnyRole("ADMIN", "USER")


                        .requestMatchers(HttpMethod.POST, "/item", "/item/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/item", "/item/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/item", "/item/**").hasRole("ADMIN")

                        // --- Cart ---
                        .requestMatchers(HttpMethod.POST, "/cart").hasRole("USER")
                        .requestMatchers(HttpMethod.GET, "/cart").hasRole("USER")
                        .requestMatchers(HttpMethod.PUT, "/cart/**").hasRole("USER")
                        .requestMatchers(HttpMethod.DELETE, "/cart/**").hasRole("USER")

                        // --- Order ---
                        .requestMatchers("/order/admin/**").hasRole("ADMIN")   // 관리자 전용
                        .requestMatchers("/order/**").permitAll()
                        .requestMatchers("/admin/**").hasRole("ADMIN")

                        // --- Consultant Chat ---
                        .requestMatchers("/consultants/**").hasRole("ADMIN")   // 관리자(상담) 전용

                        // --- Chat ---
                        .requestMatchers(HttpMethod.GET, "/chats/**").hasAnyRole("ADMIN","USER")
                        .requestMatchers(HttpMethod.POST, "/chats/**").hasAnyRole("ADMIN","USER")
                        .requestMatchers(HttpMethod.DELETE, "/chats/**").hasAnyRole("ADMIN","USER")


                        // --- Home ---
                        .requestMatchers("/home/**").permitAll()

                        // --- Maps ---
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/maps/geocode").permitAll()

                        // --- Venue ---
                        .requestMatchers(HttpMethod.GET, "/venue/**").permitAll()
                        .requestMatchers(HttpMethod.POST,
                                "/venue/*/hotel/reservations",
                                "/venue/*/hospital/reservations").authenticated()

                        .requestMatchers("/admin/venue/**").hasRole("ADMIN")  // 관리자 전용

                        // --- Reservation ---
                        .requestMatchers("/care/admin/**").hasRole("ADMIN")  // 관리자 전용

                        // --- Notification (회원/관리자만) ---
                        .requestMatchers(HttpMethod.GET,
                                "/notification",
                                "/notification/unread-count",
                                "/notification/stream"
                        ).hasAnyRole("ADMIN","USER")
                        .requestMatchers(HttpMethod.PATCH,
                                "/notification/*/mark-read"
                        ).hasAnyRole("ADMIN","USER")
                        .requestMatchers(HttpMethod.POST,
                                "/notification/mark-all-read"
                        ).hasAnyRole("ADMIN","USER")
                        .requestMatchers(HttpMethod.DELETE,
                                "/notification/*"
                        ).hasAnyRole("ADMIN","USER")

                        .anyRequest().authenticated()
                )


                // ===== 예외 응답 통일 =====
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) ->              // 인증 실패(미인증) → 401
                                res.sendError(HttpServletResponse.SC_UNAUTHORIZED))
                        .accessDeniedHandler((req, res, ex) ->                   // 인가 실패(권한없음) → 403
                                res.sendError(HttpServletResponse.SC_FORBIDDEN))
                )

                // ===== JWT 필터 =====
                //JWT 검증 필터를 UsernamePasswordAuthenticationFilter 앞에 넣어서, 세션 없이 요청마다 토큰 인증 수행.
                //blacklistService 활용해 강제 차단된 토큰 처리 가능
                .addFilterBefore(
                        new JwtAuthenticationFilter(jwtProvider, blacklistService, memberRepository, adminBlacklistJpaRepository), // 커스텀 JWT 인증 필터
                        UsernamePasswordAuthenticationFilter.class                                   // 위치 지정만, 폼 로그인은 사용 안함
                );

        return http.build();
    }

    //<img src="http://localhost:8080/files/test.png" alt="테스트 이미지"> 프론트 호출 허용
    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return (web) -> web.ignoring()
                .requestMatchers("/files","/files/**");
    }

    //Security가 참조할 CORS 설정(Origin/Headers/Methods).
    //프론트(React)와 연동할 도메인/포트만 명시하고, 자격증명(쿠키/인증헤더) 허용.
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        var cfg = new org.springframework.web.cors.CorsConfiguration();
        // === Origin 허용 목록 ===
        // CorsConfiguration을 직접 써서 리스트로 지정하는 방식
        // setAllowedOrigins는 여러 개 origin을 한 번에 넣을 수 있으니 다 허용
        cfg.setAllowedOrigins(java.util.List.of(webConfig.getFrontUrl()));
        // === 허용 메서드 ===
        cfg.setAllowedMethods(List.of(
                "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));

        // === 허용 헤더 ===
        // 기존처럼 전체(*) 허용 (Authorization 포함)
        cfg.setAllowedHeaders(List.of("*"));

        // === 자격 증명 허용 ===
        // 쿠키/Authorization 헤더를 프론트에서 보낼 수 있게 함 (axios withCredentials 등)
        cfg.setAllowCredentials(true);

        // === 노출(Exposed) 헤더 ===
        // 브라우저에서 읽을 수 있게 허용할 응답 헤더들
        cfg.setExposedHeaders(List.of(
                "Authorization"                                           // 토큰을 응답헤더로 내려줄 때 프론트에서 읽기 가능
        ));

        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);                     // 모든 경로에 위 CORS 설정 적용
        return source;
    }

}
//==================이론=======================
//.anyRequest().authenticated()
//의미: 나머지 모든 요청은 로그인되어 있어야 함
//URL 전체가 아니라, 이전에 걸린 requestMatchers 외 모든 요청에 대해 적용
//익명 사용자는 403

//.securityMatcher("/**")
//의미: SecurityFilterChain이 적용될 요청 범위를 지정
//단순히 “필터가 동작할 범위”를 정하는 거지, 권한 체크가 아님
/// login, /public/**도 포함되면, 필터 체인 자체가 거기까지 적용됨 → permitAll을 따로 걸어줘야 함
