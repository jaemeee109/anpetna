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
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(org.springframework.security.config.annotation.web.builders.HttpSecurity http, JwtProvider jwtProvider) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .formLogin(f -> f.disable())
                .httpBasic(b -> b.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/member/login").permitAll()
                        .requestMatchers("/member/join").permitAll()
                        .requestMatchers("/", "/signup", "/api/v1/**", "/member/readOne", "/member/readAll", "/member/my_page/*").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(new JwtAuthenticationFilter(jwtProvider), UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

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