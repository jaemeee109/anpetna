package com.anpetna.venue.domain.hotel;

import com.anpetna.core.coreDomain.BaseEntity;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.venue.constant.ReservationStatus;
import com.anpetna.venue.domain.VenueEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "anpetna_venue_hotel_reservation",
        indexes = {
                @Index(name = "idx_hotel_venue", columnList = "venue_id"),
                @Index(name = "idx_hotel_period", columnList = "check_in,check_out"),
                @Index(name = "idx_hotel_status", columnList = "status")
        })
@Getter @Setter @ToString(exclude = {"venue","member"})
@NoArgsConstructor @AllArgsConstructor @Builder
public class HotelReservationEntity extends BaseEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reservation_id", nullable = false)
    private Long reservationId;

    /** 어떤 매장(지점)인지 */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "venue_id", nullable = false)
    private VenueEntity venue;

    /** 누가 예약했는지 */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private MemberEntity member;

    /** 기간 점유(정원 15마리, 구간 겹침 검사) */
    @Column(name = "check_in", nullable = false)
    private LocalDate checkIn;       // 입실일(포함)

    @Column(name = "check_out", nullable = false)
    private LocalDate checkOut;      // 퇴실일(포함)

    /** 상태: 관리자 확정 필요 */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ReservationStatus status;


    /** 연락/반려동물 정보 */
    @Column(name = "reserver_name", nullable = false, length = 50)
    private String reserverName;

    @Column(name = "primary_phone", nullable = false, length = 30)
    private String primaryPhone;

    @Column(name = "secondary_phone", length = 30)
    private String secondaryPhone;

    @Column(name = "pet_name", nullable = false, length = 50)
    private String petName;

    @Column(name = "pet_birth_year", nullable = false)
    private Integer petBirthYear;

    /** 요청사항 */
    @Column(name = "memo", length = 500)
    private String memo;
}
