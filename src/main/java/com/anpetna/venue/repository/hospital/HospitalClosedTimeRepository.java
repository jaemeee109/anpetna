package com.anpetna.venue.repository.hospital;

import com.anpetna.venue.domain.hospital.HospitalClosedTimeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

// 병원 예약 '차단/마감' 시간 관리
public interface HospitalClosedTimeRepository extends JpaRepository<HospitalClosedTimeEntity, Long> {

    // 특정 일자,특정 의사 or 전체(doctorId is null) 차단된 슬롯 조회
    // 전체 휴무용
    List<HospitalClosedTimeEntity> findByDateAndDoctorIdIsNull(LocalDate date);

    // 특정 일자, 특정 의사의 차단 슬롯 조회
    // 개별 휴무용
    List<HospitalClosedTimeEntity> findByDateAndDoctorId(LocalDate date, Long doctorId);

    //특정 의사/날짜 기존 마감 레코드 일괄 삭제
    void deleteByDateAndDoctorId(LocalDate date, Long doctorId);
}
