package com.anpetna.venue.service.hospital;

import java.time.LocalDate;
import java.util.List;

// 의사 스케줄 관리
public interface HospitalScheduleService {

    // 의사 날짜별,예약 불가 시간 목록
    List<String> listUnavailableTimes(Long doctorId, LocalDate date);

   // 의사 날짜별 마감시간 저장
    void setClosedTimes(Long doctorId, LocalDate date, List<String> times);
}
