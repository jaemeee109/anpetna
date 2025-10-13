package com.anpetna.venue.controller.hospital;

import com.anpetna.venue.dto.hospital.CreateHospitalReservationReq;
import com.anpetna.venue.dto.hospital.CreateHospitalReservationRes;
import com.anpetna.venue.dto.doctor.ListDoctorsRes;
import com.anpetna.venue.service.hospital.HospitalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

// 병원 예약
@RestController
@RequestMapping("/venue")
@RequiredArgsConstructor
public class HospitalController {

    private final HospitalService hospitalService;

    // 특정 매장의 의사 목록 조회 (비회원 허용)
    @GetMapping("/{venueId}/doctors")
    public ResponseEntity<ListDoctorsRes> doctors(@PathVariable Long venueId) {
        return ResponseEntity.ok(hospitalService.listDoctors(venueId));
    } // doctors 종료

    // 병원 예약 생성 (회원)
    @PostMapping("/{venueId}/hospital/reservations")
    public ResponseEntity<CreateHospitalReservationRes> create(
            @AuthenticationPrincipal(expression = "username") String memberId,
            @PathVariable Long venueId,
            @Valid @RequestBody CreateHospitalReservationReq req
    ) {
        return ResponseEntity.ok(hospitalService.reserve(memberId, venueId, req));
    }// create 종료

} // HospitalController Class 종료
