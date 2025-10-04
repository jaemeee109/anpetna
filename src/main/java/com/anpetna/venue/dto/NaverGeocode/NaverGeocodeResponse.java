package com.anpetna.venue.dto.NaverGeocode;

import lombok.Data;
import java.util.List;

// 네이버 Geocode API 응답

@Data
public class NaverGeocodeResponse {
    private String status; // 응답 상태
    private List<Address> addresses; // 주소 후보 목록

    @Data
    public static class Address {
        private String roadAddress;   // 도로명
        private String jibunAddress;  // 지번
        private String englishAddress; // 영문표기 주소
        private String x;             // 경도 (lng)
        private String y;             // 위도 (lat)
    }
}
