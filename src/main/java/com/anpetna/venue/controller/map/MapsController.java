// src/main/java/com/anpetna/venue/controller/MapsController.java
package com.anpetna.venue.controller.map;

import com.anpetna.venue.dto.NaverGeocode.SuggestionList;
import com.anpetna.venue.service.NaverGeocodeClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Collections;

// 네이버 지오코딩

@RestController
@RequiredArgsConstructor
@RequestMapping("/maps")
@Slf4j
public class MapsController {

    private final NaverGeocodeClient geocodeClient;

    // q: 검색어 , lat/lng : 좌표를 받아 네이버 API 호출
    @GetMapping(value = "/geocode", produces = MediaType.APPLICATION_JSON_VALUE)
    public SuggestionList geocode(
            @RequestParam("q") String q,
            @RequestParam(value = "lat", required = false) Double lat,
            @RequestParam(value = "lng", required = false) Double lng
    ) {
        try {
            log.debug("[/maps/geocode] q={}, lat={}, lng={}", q, lat, lng);
            return geocodeClient.search(q, lat, lng);
        } catch (Exception e) {
            // 어떤 예외든 빈 결과로 응답해 500 방지
            log.error("geocode error: {}", e.getMessage(), e);
            return new SuggestionList(Collections.emptyList());
        }
    } // geocode 종료


    // 진단용
    // 서버에 네이버 자격증명이 설정 되어있는지 점검 (Client ID, Secret Key)
    @GetMapping("/_diag")
    public Map<String, Object> diag() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("cred", geocodeClient.hasCredentials() ? "OK" : "EMPTY");
        return m;
    } // diag 종료

} // MapsController Class 종료
