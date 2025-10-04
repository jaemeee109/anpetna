package com.anpetna.venue.domain.hospital;

import com.anpetna.core.coreDomain.BaseEntity;
import com.anpetna.venue.domain.VenueEntity;
import jakarta.persistence.*;
import lombok.*;

// 의사 엔티티

@Entity
@Table(name = "anpetna_venue_doctor",
        indexes = {
                @Index(name = "idx_doctor_venue", columnList = "venue_id"),
                @Index(name = "idx_doctor_active", columnList = "active")
        })
@Getter @Setter @ToString(exclude = "venue")
@NoArgsConstructor @AllArgsConstructor @Builder
public class VenueDoctorEntity extends BaseEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "doctor_id", nullable = false)
    private Long doctorId; // PK 의사 번호

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "venue_id", nullable = false)
    private VenueEntity venue; // 소속 매장, 다대일 매핑

    @Column(name = "name", nullable = false, length = 100)
    private String name; // // 의사 이름

    @Column(name = "active", nullable = false)
    private boolean active; // 예약가능여부 (true 근무중 / false 예약불가능 또는 퇴사)
}
