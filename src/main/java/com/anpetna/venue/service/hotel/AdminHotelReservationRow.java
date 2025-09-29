package com.anpetna.venue.service.hotel;

import com.anpetna.venue.constant.ReservationStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter @Setter @ToString
@Builder @AllArgsConstructor @NoArgsConstructor
public class AdminHotelReservationRow {
    private Long reservationId;
    private ReservationStatus status;
    private String venueName;
    private String memberId;
    private String reserverName;
    private String petName;
    private String primaryPhone;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private LocalDateTime createdAt; // BaseEntity.createDate
}
