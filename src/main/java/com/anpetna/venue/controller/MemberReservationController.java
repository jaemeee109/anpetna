package com.anpetna.venue.controller;

import com.anpetna.ApiResult;
import com.anpetna.core.coreDto.PageRequestDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.venue.dto.member.MyReservationRow;
import com.anpetna.venue.service.member.MemberReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class MemberReservationController {

    private final MemberReservationService service;

    /**
     * 로그인 회원의 예약내역(병원/호텔 합본)
     * GET /member/reservations?page=1&size=10
     */
    @GetMapping("/member/reservations")
    @PreAuthorize("isAuthenticated()")
    public ApiResult<PageResponseDTO<MyReservationRow>> myReservations(
            @AuthenticationPrincipal(expression = "username") String me,
            PageRequestDTO req
    ) {
        return new ApiResult<>(service.listMyReservations(me, req));
    }

    @GetMapping("/member/reservations/hospital/{id}")
    @PreAuthorize("isAuthenticated()")
    public ApiResult<com.anpetna.venue.dto.member.MyHospitalReservationDetail> myHospital(
            @AuthenticationPrincipal(expression = "username") String me,
            @org.springframework.web.bind.annotation.PathVariable("id") Long id
    ) {
        return new ApiResult<>(service.readHospital(me, id));
    }

    @GetMapping("/member/reservations/hotel/{id}")
    @PreAuthorize("isAuthenticated()")
    public ApiResult<com.anpetna.venue.dto.member.MyHotelReservationDetail> myHotel(
            @AuthenticationPrincipal(expression = "username") String me,
            @org.springframework.web.bind.annotation.PathVariable("id") Long id
    ) {
        return new ApiResult<>(service.readHotel(me, id));
    }

    @PostMapping("/member/reservations/hospital/{id}/cancel")
    @PreAuthorize("isAuthenticated()")
    public ApiResult<Map<String,Object>> cancelHospital(
            @AuthenticationPrincipal(expression = "username") String me,
            @org.springframework.web.bind.annotation.PathVariable("id") Long id
    ) {
        service.cancelHospital(me, id);
        return new ApiResult<>(Map.of("ok", true));
    }

    @PostMapping("/member/reservations/hotel/{id}/cancel")
    @PreAuthorize("isAuthenticated()")
    public ApiResult<Map<String,Object>> cancelHotel(
            @AuthenticationPrincipal(expression = "username") String me,
            @org.springframework.web.bind.annotation.PathVariable("id") Long id
    ) {
        service.cancelHotel(me, id);
        return new ApiResult<>(Map.of("ok", true));
    }



}
