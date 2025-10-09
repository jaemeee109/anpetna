package com.anpetna.venue.dto.member;

import com.anpetna.venue.constant.ReservationStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

// 예약 목록 조회

@Getter
@Builder
public class MyReservationRow {
    private String venueName; // 매장명
    private String type;  // 병원 or 호텔
    private ReservationStatus status; // 예약상태

    private Long reservationId; // 예약 번호

    // 병원 전용
    private LocalDateTime appointmentAt; // 예약 시간

    // 호텔 전용
    private LocalDate checkIn; //  체크인
    private LocalDate checkOut; // 체크아웃
}
