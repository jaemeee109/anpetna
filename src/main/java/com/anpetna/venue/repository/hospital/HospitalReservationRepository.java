package com.anpetna.venue.repository.hospital;

import com.anpetna.venue.domain.hospital.HospitalReservationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import com.anpetna.venue.constant.ReservationStatus;

import java.time.LocalDateTime;

public interface HospitalReservationRepository extends JpaRepository<HospitalReservationEntity, Long> {

    boolean existsByDoctor_DoctorIdAndAppointmentAt(Long doctorId, LocalDateTime appointmentAt);

    /** 특정 회원의 노쇼 건수 */
    long countByMember_MemberIdAndStatus(String memberId, ReservationStatus status);
}
