package com.anpetna.venue.controller.hospital;

import com.anpetna.venue.dto.hospital.UnavailableTimesRes;
import com.anpetna.venue.service.hospital.HospitalScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

// 병원 예약 불가 시간 조회
@RestController
@RequestMapping("/hospital")
@RequiredArgsConstructor
public class HospitalScheduleController {

    private final HospitalScheduleService hospitalScheduleService;

    // 특정 의사의 특정 날짜에서 예약 불가 시간대 조회
    @GetMapping("/unavailable-times")
    public UnavailableTimesRes listUnavailableTimes(
            @RequestParam("doctorId") Long doctorId,
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return UnavailableTimesRes.builder()
                .times(hospitalScheduleService.listUnavailableTimes(doctorId, date))
                .build();
    } // listUnavailableTimes 종료
} // HospitalScheduleController Class 종료
