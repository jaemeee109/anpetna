package com.anpetna.venue.dto.NaverGeocode;

import lombok.Data;

// 자동완성, 검색

@Data
public class Suggestion {
    private String label; // 주소 표시용 라벨 (ex. 경기도 수원시 매탄동)
    private double lat; // 위도
    private double lng; // 경도

    public Suggestion(String label, double lat, double lng) {
        this.label = label;
        this.lat = lat;
        this.lng = lng;
    }
}
