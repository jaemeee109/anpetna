package com.anpetna.venue.domain;

import com.anpetna.core.coreDomain.BaseEntity; // 공통 엔티티(작성일/수정일 등) 상속
import jakarta.persistence.*;
import lombok.*;

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
    private Long venueId;                 // PK

    @Column(name = "venue_name", nullable = false, length = 100)
    private String venueName;             // 지점명

    @Column(name = "address", nullable = false, length = 200)
    private String address;               // 주소

    @Column(name = "phone", length = 30)
    private String phone;                 // 연락처(선택)

    /** 위도/경도 (WGS84) */
    @Column(name = "latitude", nullable = false)
    private Double latitude;

    @Column(name = "longitude", nullable = false)
    private Double longitude;

    /** 노출 여부 (true면 사용자에게 보임) */
    @Column(name = "active", nullable = false)
    private boolean active;
}
