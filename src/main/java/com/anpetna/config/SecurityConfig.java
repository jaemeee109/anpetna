package com.anpetna.config;
import com.anpetna.auth.service.BlacklistServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import jakarta.servlet.http.HttpServletResponse; // ★추가
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;
@Configuration
@EnableWebSecurity
//Spring Security가 AOP Proxy를 만들어서 해당 메서드를 감쌉니다.
@RequiredArgsConstructor
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtProvider jwtProvider, BlacklistServiceImpl blacklistService, CorsConfigurationSource corsConfigurationSource) throws Exception {
        http
                .cors(c -> c.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())

                //기본 Spring Security 로그인 폼, HTTP Basic 인증 비활성화
                //JWT 기반 로그인/인증만 사용하기 위해 끔
                .formLogin(f -> f.disable())
                .httpBasic(b -> b.disable())

                //JWT는 stateless 인증 → 서버 세션 불필요
                //따라서 STATELESS 설정 → Spring Security가 세션 생성하지 않음
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                //특정 경로는 모두 허용 (permitAll()) : 로그인, 회원가입, 공용 API 등
                //그 외 요청은 인증 필요 (authenticated()) : JWT 토큰이 유효해야 접근 가능
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()           // ★추가: CORS preflight 허용
                        .requestMatchers("/jwt/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/member/login").permitAll()
                        .requestMatchers("/member/join").permitAll()
                        .requestMatchers("/", "/signup", "/api/v1/**", "/member/readOne", "/member/readAll", "/member/my_page/*").permitAll()
                        .anyRequest().authenticated()
                )
                .exceptionHandling(e -> e                                             // ★추가: 에러 응답 분리
                        .authenticationEntryPoint((req, res, ex) ->
                                res.sendError(HttpServletResponse.SC_UNAUTHORIZED))   // 401
                        .accessDeniedHandler((req, res, ex) ->
                                res.sendError(HttpServletResponse.SC_FORBIDDEN))      // 403
                )
                .addFilterBefore(new JwtAuthenticationFilter(jwtProvider,blacklistService), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    /** Security가 참조할 CORS 설정(Origin/Headers/Methods). MVC WebConfig와 동일하게 맞춰줌 */
    // 프론트 연결 코드 추가
    @Bean
    public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
        var cfg = new org.springframework.web.cors.CorsConfiguration();
        cfg.setAllowedOrigins(java.util.List.of("http://192.168.0.160:3000")); // 정확한 Origin (와일드카드 X)
        cfg.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        cfg.setAllowedHeaders(java.util.List.of("*")); // Authorization 포함
        cfg.setAllowCredentials(true); // withCredentials/Authorization 사용할 때 필수
        var source = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}