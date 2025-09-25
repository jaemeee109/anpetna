package com.anpetna.venue.constant;

public enum ReservationStatus {
    PENDING,    // 사용자 예약신청 (확정 전)
    CONFIRMED,  // 관리자 확정
    REJECTED,   // 관리자 거절
    CANCELED,    // 사용자 취소
    NOSHOW      // 노쇼(예약했으나 내원/입실하지 않음)
}
