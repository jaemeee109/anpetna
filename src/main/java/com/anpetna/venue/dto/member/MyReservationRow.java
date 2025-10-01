package com.anpetna.venue.dto.member;

import com.anpetna.venue.constant.ReservationStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class MyReservationRow {
    private String venueName;                  // anpetna_venue의 venue_name
    private String type;                       // "HOSPITAL" | "HOTEL"
    private ReservationStatus status;

    private Long reservationId;

    // 병원 전용
    private LocalDateTime appointmentAt;

    // 호텔 전용
    private LocalDate checkIn;
    private LocalDate checkOut;
}
