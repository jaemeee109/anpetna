package com.anpetna.venue.dto.doctor;


import lombok.*;

// 병원 의사 DTO
// 예약 폼에서 의사 선택용

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DoctorDTO {
    private Long doctorId; //  PK 의사 번호
    private String name; // 의사 이름
}