package com.anpetna.venue.dto.hotel;


import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;

// 호텔 예약 생성 요청


@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateHotelReservationReq {

    @NotNull private LocalDate checkIn;     // 체크인
    @NotNull private LocalDate checkOut;    // 체크아웃


    @NotBlank @Size(max=50)  private String reserverName; // 예약자명
    @NotBlank @Size(max=30)  private String primaryPhone; // 예약자 연락처
    @Size(max=30)            private String secondaryPhone; // 추가 연락처

    @NotBlank @Size(max=50)  private String petName; // 반려동물 이름
    @NotNull                 private Integer petBirthYear; // 반려동물 출생연도

    @Size(max=500)           private String memo; // 요청사항 (메모)
}