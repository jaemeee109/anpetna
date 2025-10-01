package com.anpetna.venue.dto.hotel;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateHotelReservationRes {

    private Long reservationId;

    private Integer estimatedPrice;
}