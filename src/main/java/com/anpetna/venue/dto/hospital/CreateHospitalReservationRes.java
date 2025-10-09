package com.anpetna.venue.dto.hospital;

import lombok.*;

// 병원 예약 생성 성공시, 예약 식별자 반환

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateHospitalReservationRes {
    private Long reservationId; // PK 예약번호
}