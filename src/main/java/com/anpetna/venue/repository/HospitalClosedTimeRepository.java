package com.anpetna.venue.repository;

import com.anpetna.venue.domain.HospitalClosedTimeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface HospitalClosedTimeRepository extends JpaRepository<HospitalClosedTimeEntity, Long> {

    /** 특정 일자에, 특정 의사 or 전체(doctorId is null) 차단된 슬롯 조회 */
    List<HospitalClosedTimeEntity> findByDateAndDoctorIdIsNull(LocalDate date);

    List<HospitalClosedTimeEntity> findByDateAndDoctorId(LocalDate date, Long doctorId);

    //특정 의사/날짜 기존 마감 레코드 일괄 삭제
    void deleteByDateAndDoctorId(LocalDate date, Long doctorId);
}
