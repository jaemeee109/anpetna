package com.anpetna.venue.domain;

import com.anpetna.core.coreDomain.BaseEntity;
import com.anpetna.member.domain.MemberEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "anpetna_venue_reservation",
        indexes = {
                @Index(name = "idx_resv_venue", columnList = "venue_id"),     // venue 조회 인덱스
                @Index(name = "idx_resv_member", columnList = "member_id"),   // member 조회 인덱스
                @Index(name = "idx_resv_at", columnList = "reserved_at")      // 날짜 조회 인덱스
        }
)
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class VenueReservationEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reservation_id")
    private Long reservationId;               // 예약 PK

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "venue_id", nullable = false)
    private VenueEntity venue;                // 어떤 지점에 대한 예약인지

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private MemberEntity member;              // 누가 예약했는지

    @Column(name = "reserved_at", nullable = false)
    private LocalDateTime reservedAt;         // 예약 일시

    @Column(name = "memo", length = 500)
    private String memo;                      // 메모(선택)
}
