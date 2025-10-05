package com.anpetna.venue.controller;

import com.anpetna.ApiResult;
import com.anpetna.core.coreDto.PageRequestDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.venue.dto.member.MyHospitalReservationDetail;
import com.anpetna.venue.dto.member.MyHotelReservationDetail;
import com.anpetna.venue.dto.member.MyReservationRow;
import com.anpetna.venue.service.member.MemberReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

// 회원용(로그인 필수) 예약 조회 및 취소 API
@RestController
@RequiredArgsConstructor
public class MemberReservationController {

    private final MemberReservationService service;

    // 예약 목록 조회
    @GetMapping("/member/reservations")
    @PreAuthorize("isAuthenticated()")
    public ApiResult<PageResponseDTO<MyReservationRow>> myReservations(
            @AuthenticationPrincipal(expression = "username") String me,
            PageRequestDTO req
    ) {
        return new ApiResult<>(service.listMyReservations(me, req));
    } // myReservations 종료

    // '병원' 예약 상세 내역 조회
    @GetMapping("/member/reservations/hospital/{id}")
    @PreAuthorize("isAuthenticated()")
    public ApiResult<MyHospitalReservationDetail> myHospital(
            @AuthenticationPrincipal(expression = "username") String me,
            @PathVariable("id") Long id
    ) {
        return new ApiResult<>(service.readHospital(me, id));
    } // myHospital 종료

    
    // '호텔' 예약 상세 내역 조회
    @GetMapping("/member/reservations/hotel/{id}")
    @PreAuthorize("isAuthenticated()")
    public ApiResult<MyHotelReservationDetail> myHotel(
            @AuthenticationPrincipal(expression = "username") String me,
            @PathVariable("id") Long id
    ) {
        return new ApiResult<>(service.readHotel(me, id));
    } // myHotel 종료

    
    // '병원' 예약 취소
    @PostMapping("/member/reservations/hospital/{id}/cancel")
    @PreAuthorize("isAuthenticated()")
    public ApiResult<Map<String,Object>> cancelHospital(
            @AuthenticationPrincipal(expression = "username") String me,
            @PathVariable("id") Long id
    ) {
        service.cancelHospital(me, id);
        return new ApiResult<>(Map.of("ok", true));
    } // cancelHospital 종료

    
    // '호텔' 예약 취소
    @PostMapping("/member/reservations/hotel/{id}/cancel")
    @PreAuthorize("isAuthenticated()")
    public ApiResult<Map<String,Object>> cancelHotel(
            @AuthenticationPrincipal(expression = "username") String me,
            @PathVariable("id") Long id
    ) {
        service.cancelHotel(me, id);
        return new ApiResult<>(Map.of("ok", true));
    }// cancelHotel 종료



} // MemberReservationController Class 종료
