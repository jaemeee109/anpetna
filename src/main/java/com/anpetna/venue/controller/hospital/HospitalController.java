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

@RestController
@RequestMapping("/venue")
@RequiredArgsConstructor
public class HospitalController {

    private final HospitalService hospitalService;

    /** 매장별 의사 목록(비로그인도 가능) */
    @GetMapping("/{venueId}/doctors")
    public ResponseEntity<ListDoctorsRes> doctors(@PathVariable Long venueId) {
        return ResponseEntity.ok(hospitalService.listDoctors(venueId));
    }

    /** 애견병원 예약 생성(로그인 필요) */
    @PostMapping("/{venueId}/hospital/reservations")
    public ResponseEntity<CreateHospitalReservationRes> create(
            @AuthenticationPrincipal(expression = "username") String memberId,
            @PathVariable Long venueId,
            @Valid @RequestBody CreateHospitalReservationReq req
    ) {
        return ResponseEntity.ok(hospitalService.reserve(memberId, venueId, req));
    }
}
