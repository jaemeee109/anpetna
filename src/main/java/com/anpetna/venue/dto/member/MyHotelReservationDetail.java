package com.anpetna.venue.dto.member;

import com.anpetna.venue.constant.ReservationStatus;
import lombok.*;

import java.time.LocalDate;

@Getter @Setter @ToString
@Builder @AllArgsConstructor @NoArgsConstructor
public class MyHotelReservationDetail {
    // 호텔 예약 폼 데이터보관용
    private Long reservationId;
    private String venueName;
    private String service; // 호텔
    private ReservationStatus status;

    private LocalDate checkIn;
    private LocalDate checkOut;

    private String reserverName;
    private String primaryPhone;
    private String secondaryPhone;

    private String petName;
    private Integer petBirthYear;

    private String memo;
}
