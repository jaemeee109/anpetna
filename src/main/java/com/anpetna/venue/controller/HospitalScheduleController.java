package com.anpetna.venue.controller;

import com.anpetna.venue.dto.hospital.UnavailableTimesRes;
import com.anpetna.core.service.HospitalScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/hospital")
@RequiredArgsConstructor
public class HospitalScheduleController {

    private final HospitalScheduleService hospitalScheduleService;

    /**
     * 의사/날짜별 예약 불가 시간 목록 조회
     * 예) GET /hospital/unavailable-times?doctorId=3&date=2025-09-10
     * 응답: { "times": ["10:00","11:30", ...] }
     */
    @GetMapping("/unavailable-times")
    public UnavailableTimesRes listUnavailableTimes(
            @RequestParam("doctorId") Long doctorId,
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return UnavailableTimesRes.builder()
                .times(hospitalScheduleService.listUnavailableTimes(doctorId, date))
                .build();
    }
}
