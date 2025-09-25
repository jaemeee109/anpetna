package com.anpetna.venue.domain.hospital;

import com.anpetna.core.coreDomain.BaseEntity;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.venue.constant.PetGender;
import com.anpetna.venue.constant.ReservationStatus;
import com.anpetna.venue.domain.VenueDoctorEntity;
import com.anpetna.venue.domain.VenueEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

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
    private Long reservationId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "venue_id", nullable = false)
    private VenueEntity venue;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private MemberEntity member;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private VenueDoctorEntity doctor;

    /** 30분 단위 슬롯 시작 시간 (10:00~18:00, 13~14 제외) */
    @Column(name = "appointment_at", nullable = false)
    private LocalDateTime appointmentAt;

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

    @Column(name = "pet_species", nullable = false, length = 50)
    private String petSpecies;

    @Enumerated(EnumType.STRING)
    @Column(name = "pet_gender", nullable = false, length = 10)
    private PetGender petGender;

    @Column(name = "memo", length = 500)
    private String memo;
}