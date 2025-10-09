package com.anpetna.venue.repository.hospital;

import com.anpetna.venue.domain.hospital.HospitalReservationEntity;
import com.anpetna.venue.constant.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

// 병원 예약(의사 진료 예약)을 DB에서 조회,저장,검증
public interface HospitalReservationRepository extends JpaRepository<HospitalReservationEntity, Long> {

    // 동일 의사,동일 시각 중복 예약 여부
    boolean existsByDoctor_DoctorIdAndAppointmentAt(Long doctorId, LocalDateTime appointmentAt);

    // 특정 회원의 상태별 예약 건수(노쇼 등) */
    long countByMember_MemberIdAndStatus(String memberId, ReservationStatus status);

    // '의사 + 기간'으로 예약 목록 조회 (연관경로: doctor.doctorId) */
    List<HospitalReservationEntity> findByDoctor_DoctorIdAndAppointmentAtBetween(
            Long doctorId,
            LocalDateTime start,
            LocalDateTime end
    );
}
