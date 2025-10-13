package com.anpetna.venue.domain.hospital;

import com.anpetna.core.coreDomain.BaseEntity;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.venue.constant.PetGender;
import com.anpetna.venue.constant.ReservationStatus;
import com.anpetna.venue.domain.hospital.VenueDoctorEntity;
import com.anpetna.venue.domain.VenueEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

// 병원 예약
// 매장, 회원, 의사, 예약시간 (30분단위), 상태 및 반려동물 정보 보관

@Entity
@Table(name = "anpetna_venue_hospital_reservation",
        indexes = {
                @Index(name = "idx_hospital_venue", columnList = "venue_id"),
                @Index(name = "idx_hospital_doctor", columnList = "doctor_id"),
                @Index(name = "idx_hospital_slot", columnList = "appointment_at"),
                @Index(name = "idx_hospital_status", columnList = "status")
        })
@Getter @Setter @ToString(exclude = {"venue","member","doctor"})
@NoArgsConstructor @AllArgsConstructor @Builder
public class HospitalReservationEntity extends BaseEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reservation_id", nullable = false)
    private Long reservationId; // PK 예약 번호

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "venue_id", nullable = false)
    private VenueEntity venue; // 매장

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private MemberEntity member;  // 로그인 한 회원
    

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private VenueDoctorEntity doctor; // 예약 의사

    /** 30분 단위 슬롯 시작 시간 (10:00~18:00, 13~14 제외) */
    @Column(name = "appointment_at", nullable = false)
    private LocalDateTime appointmentAt; // 예약 시간

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

    @Column(name = "pet_species", nullable = false, length = 50)
    private String petSpecies; // 반려동물 종류

    @Enumerated(EnumType.STRING)
    @Column(name = "pet_gender", nullable = false, length = 10)
    private PetGender petGender; // 반려동물 성별

    @Column(name = "memo", length = 500)
    private String memo; // 예약자용 요청사항
}