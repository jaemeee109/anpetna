package com.anpetna.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:3000", "http://192.168.0.160:3000")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
    //즉 백엔드 기준으로 “이 출처에서 오는 요청만 받겠다” 라는 화이트리스트를 적는 자리
    //CORS는 “브라우저가 API 호출할 때 요청을 보내는 출처(origin)”를 체크하니까, 프론트 주소를 정확히 써줘야만 통신이 허용
    //allowedOrigins는 여러 번 호출해도 덮어쓰기라서 마지막 것만 유효 -> 여러 개 origin을 한 번에 지정하기

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = "file:" + (uploadDir.endsWith("/") ? uploadDir : uploadDir + "/");
        registry.addResourceHandler("/files/**")
                .addResourceLocations(location);
    }

    //실제 파일 위치와 URL 매핑 구분
    //브라우저가 GET /files/test.png 호출
    //서버는 /tmp/uploads/test.png 읽어서 반환
    //즉, /images/**는 "가짜 URL prefix", uploadPath는 "실제 물리 경로".

}
