package com.anpetna.pay.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;

/**
 * 토스 결제 REST 호출용 RestTemplate.
 * - Basic 인증: Authorization: Basic base64(SECRET_KEY + ":")
 * - Content-Type: application/json
 */
@Configuration
public class TossPaymentConfig {

    @Value("${toss.secret-key:}") // ✅ 이름 통일 + 기본값(빈문자)로 부팅시 명확히 체크
    private String secretKey;

    @Bean
    public RestTemplate tossRestTemplate() {
        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException("toss.secret-key 누락. 환경변수 TOSS_SECRET_KEY 또는 application.properties를 확인하세요.");
        }

        RestTemplate rt = new RestTemplate();
        ClientHttpRequestInterceptor auth = (req, body, exec) -> {
            String basic = Base64.getEncoder().encodeToString((secretKey + ":").getBytes(StandardCharsets.UTF_8));
            req.getHeaders().set("Authorization", "Basic " + basic);
            req.getHeaders().set("Content-Type", "application/json");
            req.getHeaders().set("Accept", "application/json");
            return exec.execute(req, body);
        };
        rt.setInterceptors(List.of(auth));
        return rt;
    }
}
