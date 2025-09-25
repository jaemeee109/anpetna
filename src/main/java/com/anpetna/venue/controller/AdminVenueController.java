package com.anpetna.venue.controller;

import com.anpetna.venue.service.hotel.HotelService;
import com.anpetna.venue.service.hospital.HospitalService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자 전용: 예약 확정 / (선택) 마감토글
 * - 확정: 상태를 PENDING -> CONFIRMED 로 변경
 * - 마감토글은 DB 별도 테이블 없이, 정원/슬롯 검증으로도 충분히 운영 가능
 *   (필요 시 venue별 close 플래그 테이블을 별도로 추가하세요)
 */
@RestController
@RequestMapping("/admin/venue")
@RequiredArgsConstructor
public class AdminVenueController {

    private final HotelService hotelService;
    private final HospitalService hospitalService;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/hotel/reservations/{reservationId}/confirm")
    public void confirmHotel(@PathVariable Long reservationId) {
        hotelService.confirm(reservationId);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/hospital/reservations/{reservationId}/confirm")
    public void confirmHospital(@PathVariable Long reservationId) {
        hospitalService.confirm(reservationId);
    }

    /** 호텔 예약 노쇼 처리 */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/hotel/reservations/{reservationId}/noshow")
    public void noShowHotel(@PathVariable Long reservationId) {
        hotelService.markNoShow(reservationId);
    }

    /** 병원 예약 노쇼 처리 */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/hospital/reservations/{reservationId}/noshow")
    public void noShowHospital(@PathVariable Long reservationId) {
        hospitalService.markNoShow(reservationId);
    }

}
