package com.anpetna.venue.domain.hotel;

import com.anpetna.core.coreDomain.BaseEntity;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.venue.constant.ReservationStatus;
import com.anpetna.venue.domain.VenueEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

// 호텔 예약
// 체크인~체크아웃 기간 설정
// 매장당 1일 15마리까지 허용, 기간 겹침 중복 검사, 상태 필더링 인덱스 설정

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
    private Long reservationId; // PK 예약번호

    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "venue_id", nullable = false)
    private VenueEntity venue; // 매장

    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private MemberEntity member; // 로그인 한 회원

    /** 기간 점유(정원 15마리, 구간 겹침 검사) */
    @Column(name = "check_in", nullable = false)
    private LocalDate checkIn;   // 체크인

    @Column(name = "check_out", nullable = false)
    private LocalDate checkOut;   // 체크아웃


    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ReservationStatus status; // 예약 상태


    /** 연락/반려동물 정보 */
    @Column(name = "reserver_name", nullable = false, length = 50)
    private String reserverName; // 예약자명

    @Column(name = "primary_phone", nullable = false, length = 30)
    private String primaryPhone; // 예약자 대표 연락처

    @Column(name = "secondary_phone", length = 30)
    private String secondaryPhone; // 예약자 보조 연락처

    @Column(name = "pet_name", nullable = false, length = 50)
    private String petName; // 반려동물 이름

    @Column(name = "pet_birth_year", nullable = false)
    private Integer petBirthYear; // 반려동물 나이


    @Column(name = "memo", length = 500)
    private String memo; // 예약자용 요청사항
}
