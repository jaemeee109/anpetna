package com.anpetna.config;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
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
@RequiredArgsConstructor
@EnableMethodSecurity(prePostEnabled = true) //  메서드 시큐리티 (프론트연결코드추가)
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtProvider jwtProvider, CorsConfigurationSource corsConfigurationSource) throws Exception {
        http

                .cors(c -> c.configurationSource(corsConfigurationSource())) // 프론트 연결 코드 추가
                .csrf(csrf -> csrf.disable())
                .formLogin(f -> f.disable())
                .httpBasic(b -> b.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll() // 프론트 연결 코드 추가

                        // 로그인 회원가입 리프레시 공개
                        .requestMatchers(HttpMethod.POST, "/member/login").permitAll()
                        .requestMatchers("/member/join").permitAll()
                        .requestMatchers(HttpMethod.POST, "/auth/refresh").permitAll()

                        // 목록/상세는 컨트롤러에서 세부권한 판단하려고 일단 열기
                        .requestMatchers(HttpMethod.GET, "/anpetna/board/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/anpetna/board/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/anpetna/comment/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/anpetna/comment/**").permitAll()


                        .requestMatchers("/", "/signup", "/api/v1/**", "/member/readOne", "/member/readAll", "/member/my_page/*").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(new JwtAuthenticationFilter(jwtProvider), UsernamePasswordAuthenticationFilter.class);
//                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /** Security가 참조할 CORS 설정(Origin/Headers/Methods). MVC WebConfig와 동일하게 맞춰줌 */
    // 프론트 연결 코드 추가
    @Bean
    public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
        var cfg = new org.springframework.web.cors.CorsConfiguration();
        cfg.setAllowedOrigins(java.util.List.of("http://192.168.0.160:3000")); // 정확한 Origin (와일드카드 X)
        cfg.setAllowedMethods(java.util.List.of("GET","POST","PUT","DELETE","PATCH","OPTIONS"));
        cfg.setAllowedHeaders(java.util.List.of("*")); // Authorization 포함
        cfg.setAllowCredentials(true); // withCredentials/Authorization 사용할 때 필수

        var source = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
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