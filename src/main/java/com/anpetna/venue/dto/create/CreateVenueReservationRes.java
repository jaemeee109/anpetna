package com.anpetna.venue.dto.create;

import lombok.*;

/** 예약 생성 성공 시, 생성된 예약의 PK만 내려주는 응답 DTO */
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class CreateVenueReservationRes {
    private Long reservationId;
}
