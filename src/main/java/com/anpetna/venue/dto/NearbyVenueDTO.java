package com.anpetna.venue.dto;

import lombok.*;

// 매장 정보 DTO
// 목록 화면, 지도 마커 리스트, 요청 좌표로부터 거리 등

@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class NearbyVenueDTO {
    private Long   venueId;     // PK 매장번호
    private String venueName;   // 매장명
    private String address;     // 주소
    private String phone;       // 연락처
    private Double latitude;    // 위도
    private Double longitude;   // 경도

    // 요청 좌표로부터의 거리(km, 소수 2자리)
    private Double distanceKm;
}
