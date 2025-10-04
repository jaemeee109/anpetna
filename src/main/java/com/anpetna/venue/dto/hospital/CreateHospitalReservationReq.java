package com.anpetna.venue.dto.hospital;


import com.anpetna.venue.constant.PetGender;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDateTime;

// 병원 예약 생성 요청

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateHospitalReservationReq {

    @NotNull private Long doctorId; // 의사번호
    @NotNull private LocalDateTime appointmentAt; // 타임 슬롯 30분 단위

    @NotBlank @Size(max=50)  private String reserverName; // 예약자명
    @NotBlank @Size(max=30)  private String primaryPhone; // 예약자 연락처
    @Size(max=30)            private String secondaryPhone; // 추가 연락처

    @NotBlank @Size(max=50)  private String petName; // 반려동물 이름
    @NotNull                 private Integer petBirthYear; // 반려동물 출생연도

    @NotBlank @Size(max=50)  private String petSpecies; // 반려동물 종류
    @NotNull                 private PetGender petGender; // 반려동물 성별

    @Size(max=500)           private String memo; // 요청사항(메모)
}
