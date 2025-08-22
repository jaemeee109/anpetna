package com.anpetna.config;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
//Spring Security가 AOP Proxy를 만들어서 해당 메서드를 감쌉니다.
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    //  HTTP 요청 → 인증/인가 필터 체인”을 Bean으로 정의한 것
    public SecurityFilterChain filterChain(HttpSecurity http, JwtProvider jwtProvider) throws Exception {
        http
                //JWT는 stateless 인증이므로 CSRF 토큰 필요 없음
                //따라서 CSRF 보호를 끄고, POST 요청도 자유롭게 처리
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
                        .requestMatchers(HttpMethod.POST, "/member/login").permitAll()
                        .requestMatchers("/member/join").permitAll()
                        .requestMatchers("/", "/signup", "/api/v1/**", "/member/readOne", "/member/readAll", "/member/my_page/*").permitAll()
                        .anyRequest().authenticated()
                )

                //JwtAuthenticationFilter를 UsernamePasswordAuthenticationFilter 전에 실행
                //Filter 역할: 요청에서 JWT 꺼내기 / 유효성 검사 / SecurityContextHolder에 Authentication 설정
                .addFilterBefore(new JwtAuthenticationFilter(jwtProvider), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }


//    @Bean
//    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception{
//        http.formLogin(form -> {form
//                .loginPage("/member/login")
//                .loginProcessingUrl("/member/login_process")
//                .defaultSuccessUrl("/member")
//                .failureUrl("/member/login.html?error=true")
//                .permitAll();
//        });
//        http.authorizeHttpRequests((auth) -> auth
//                .requestMatchers("/", "/login", "/signup").permitAll()
//                .requestMatchers("/admin").hasRole("ADMIN")
//                .requestMatchers("/api/v1/**").hasAnyRole("USER", "ADMIN")
//                .anyRequest().authenticated()
//        );
//        return http.build();
//    }
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

//    @Bean
//    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration)
//            throws Exception {
//        return authenticationConfiguration.getAuthenticationManager();
//    }

//    @Bean
//    SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwt) throws Exception {
//        http.csrf(AbstractHttpConfigurer::disable)
//                .sessionManagement(sm -> {
//                    sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS);
//                })
//                .authorizeHttpRequests(auth -> {
//                    auth.requestMatchers("/api/auth/**", "/v3/api-docs/**", "/swagger-ui.html", "/swagger-ui/**",
//                                    "/images/**", "/api/item/**", "/api/member/**", "/api/login/**").permitAll()
//                            .anyRequest()
//                            .authenticated();
//                })
//                .formLogin(AbstractHttpConfigurer::disable)
//                .httpBasic(AbstractHttpConfigurer::disable)
//                .exceptionHandling(e -> {
//                    e.authenticationEntryPoint((req, res, ex) -> {
//                        res.sendError(HttpServletResponse.SC_UNAUTHORIZED);
//                    });
//                })
//                .addFilterBefore(jwt, UsernamePasswordAuthenticationFilter.class);
//        return http.build();
//    }


}