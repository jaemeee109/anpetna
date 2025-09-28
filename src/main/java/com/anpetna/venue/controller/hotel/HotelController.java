package com.anpetna.venue.controller.hotel;

import com.anpetna.venue.dto.hotel.CreateHotelReservationReq;
import com.anpetna.venue.dto.hotel.CreateHotelReservationRes;
import com.anpetna.venue.service.hotel.HotelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/venue")
@RequiredArgsConstructor
public class HotelController {

    private final HotelService hotelService;

    /** 애견호텔 예약 생성(로그인 필요) */
    @PostMapping("/{venueId}/hotel/reservations")
    public ResponseEntity<CreateHotelReservationRes> create(
            @AuthenticationPrincipal(expression = "username") String memberId,
            @PathVariable Long venueId,
            @Valid @RequestBody CreateHotelReservationReq req
    ) {
        return ResponseEntity.ok(hotelService.reserve(memberId, venueId, req));
    }
}
