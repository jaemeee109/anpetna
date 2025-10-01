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

    /** 의사/날짜별 마감 시간(HH:mm) 저장: 기존 마감은 모두 지우고, 전달받은 목록으로 대체 */
    void setClosedTimes(Long doctorId, LocalDate date, List<String> times);
}
