package com.anpetna.venue.domain;

import com.anpetna.core.coreDomain.BaseEntity; 
import jakarta.persistence.*;
import lombok.*;

// 매장(Venue) 엔티티
// 병원, 호텔 오프라인 매장 기본 정보 보관
// 지도 검색(위도/경도), 노출여부 필터링에 최적화된 인덱스 설정

@Entity
@Table(
        name = "anpetna_venue",
        indexes = {
                @Index(name = "idx_venue_active", columnList = "active"),                 // active 필터링 인덱스
                @Index(name = "idx_venue_lat_lng", columnList = "latitude, longitude")    // 위경도 검색용 인덱스
        }
)
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class VenueEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "venue_id")
    private Long venueId;                 // PK 매장번호

    @Column(name = "venue_name", nullable = false, length = 100)
    private String venueName;             // 매장명

    @Column(name = "address", nullable = false, length = 200)
    private String address;               // 매장주소

    @Column(name = "phone", length = 30)
    private String phone;                 // 매장연락처(선택)

    // 지도 및 주변 검색용
    @Column(name = "latitude", nullable = false)
    private Double latitude; // 위도

    @Column(name = "longitude", nullable = false)
    private Double longitude; // 경도


    @Column(name = "active", nullable = false)
    private boolean active; //노출 여부 (true면 사용자에게 보임)
}
