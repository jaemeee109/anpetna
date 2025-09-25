package com.anpetna.venue.domain;

import com.anpetna.core.coreDomain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

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
    private Long doctorId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "venue_id", nullable = false)
    private VenueEntity venue;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "active", nullable = false)
    private boolean active;
}
