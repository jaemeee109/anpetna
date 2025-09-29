package com.anpetna.venue.domain.hospital;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "hospital_closed_time")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class HospitalClosedTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** null 가능: null이면 '해당 병원 전체(모든 의사)' 차단, 값이 있으면 해당 의사만 차단 */
    private Long doctorId;

    /** 차단 일자 (필수) */
    private LocalDate date;

    /** 차단 시간(HH:mm, 30분 단위) (필수) */
    private LocalTime time;

    /** 관리자 메모(선택) */
    private String reason;
}
