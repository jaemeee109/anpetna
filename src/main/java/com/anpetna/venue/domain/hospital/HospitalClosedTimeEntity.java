package com.anpetna.venue.domain.hospital;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

// 병원 예약 차단 슬롯
// 1. 특정 날짜 , 시간대에 예약을 받지 않도록 막음
// 2. doctorId=null 이면 전체 의사의 예약을 차단, 값이 있으면 해당 의사의 예약 차단
// 3. 30분 단위를 기준으로 슬롯 관리 (10시~19시)

@Entity
@Table(name = "hospital_closed_time")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class HospitalClosedTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // PK 슬롯 번호


    private Long doctorId; // 예약 차단 대상 의사번호

    /** 차단 일자 (필수) */
    private LocalDate date; // 차단 날짜


    private LocalTime time; // 차단 시간 (30분 단위)

  
    private String reason; // 차단 사유 기록
}
