package com.anpetna.venue.dto.hotel;

import lombok.*;

// 호텔 예약 생성 성공시 반환

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateHotelReservationRes {

    private Long reservationId; // PK 예약 번호


}