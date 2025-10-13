package com.anpetna.venue.service.hospital;

import com.anpetna.venue.domain.hospital.HospitalReservationEntity;
import com.anpetna.venue.domain.hospital.HospitalClosedTimeEntity;
import com.anpetna.venue.repository.hospital.HospitalReservationRepository;
import com.anpetna.venue.repository.hospital.HospitalClosedTimeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.anpetna.venue.constant.ReservationStatus;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;


// 의사 스케줄 관리 구현
@Service
@RequiredArgsConstructor
public class HospitalScheduleServiceImpl implements HospitalScheduleService {

    private final HospitalReservationRepository hospitalReservationRepository;
    private final HospitalClosedTimeRepository hospitalClosedTimeRepository;

    @Override
    @Transactional(readOnly = true)
    public List<String> listUnavailableTimes(Long doctorId, LocalDate date) {
        if (doctorId == null || date == null) return Collections.emptyList();

        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end   = date.atTime(LocalTime.MAX);

        // (1) 이미 예약된 슬롯: CONFIRMED/NOSHOW만 불가 처리
        List<String> reserved = hospitalReservationRepository
                .findByDoctor_DoctorIdAndAppointmentAtBetween(doctorId, start, end)
                .stream()
                .filter(r -> r.getStatus() == ReservationStatus.CONFIRMED
                        || r.getStatus() == ReservationStatus.NOSHOW)
                .map(HospitalReservationEntity::getAppointmentAt)
                .filter(Objects::nonNull)
                .map(dt -> String.format("%02d:%02d", dt.getHour(), dt.getMinute()))
                .toList();

        // (2) 관리자 마감 슬롯 (해당 의사 + 공통 마감)
        List<String> blocked = new ArrayList<>();
        blocked.addAll(
                hospitalClosedTimeRepository.findByDateAndDoctorId(date, doctorId)
                        .stream()
                        .map(ct -> String.format("%02d:%02d", ct.getTime().getHour(), ct.getTime().getMinute()))
                        .toList()
        );
        blocked.addAll(
                hospitalClosedTimeRepository.findByDateAndDoctorIdIsNull(date)
                        .stream()
                        .map(ct -> String.format("%02d:%02d", ct.getTime().getHour(), ct.getTime().getMinute()))
                        .toList()
        );

        // (3) 중복 제거 + 정렬
        LinkedHashSet<String> set = new LinkedHashSet<>();
        set.addAll(reserved);
        set.addAll(blocked);
        return set.stream().distinct().sorted().toList();
    }


    @Override
    @Transactional
    public void setClosedTimes(Long doctorId, LocalDate date, List<String> times) {
        if (doctorId == null || date == null) return;

        // 기존 마감 삭제
        hospitalClosedTimeRepository.deleteByDateAndDoctorId(date, doctorId);

        // 새 마감 저장
        if (times != null && !times.isEmpty()) {
            List<HospitalClosedTimeEntity> rows = times.stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(s -> s.matches("^\\d{2}:\\d{2}$"))
                    .map(s -> {
                        String[] hm = s.split(":");
                        LocalTime t = LocalTime.of(Integer.parseInt(hm[0]), Integer.parseInt(hm[1]));
                        return HospitalClosedTimeEntity.builder()
                                .date(date)
                                .doctorId(doctorId)
                                .time(t)
                                .build();
                    })
                    .toList();
            hospitalClosedTimeRepository.saveAll(rows);
        }
    }
}
