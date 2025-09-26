package com.anpetna.venue.service.hospital;

import java.time.LocalDate;
import java.util.List;

public interface HospitalScheduleService {
    /**
     * 의사/날짜별 예약 불가 시간 목록(HH:mm).
     * - 이미 예약 완료된 시간
     * - (선택) 관리자 차단 슬롯
     */
    List<String> listUnavailableTimes(Long doctorId, LocalDate date);
}
