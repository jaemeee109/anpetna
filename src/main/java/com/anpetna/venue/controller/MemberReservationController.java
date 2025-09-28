package com.anpetna.venue.controller;

import com.anpetna.ApiResult;
import com.anpetna.core.coreDto.PageRequestDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.venue.dto.member.MyReservationRow;
import com.anpetna.venue.service.MemberReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
