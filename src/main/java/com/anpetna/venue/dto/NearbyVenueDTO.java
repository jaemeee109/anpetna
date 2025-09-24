package com.anpetna.venue.dto;

import lombok.*;

/** 단일 지점 정보 + '요청 좌표로부터의 거리'를 담는 DTO */
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class NearbyVenueDTO {
    private Long   venueId;     // 지점 PK
    private String venueName;   // 지점명
    private String address;     // 주소
    private String phone;       // 연락처
    private Double latitude;    // 위도
    private Double longitude;   // 경도
    /** 요청 좌표로부터의 거리(km, 소수 2자리) */
    private Double distanceKm;
}
