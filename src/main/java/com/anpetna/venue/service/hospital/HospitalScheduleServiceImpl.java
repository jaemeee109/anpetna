package com.anpetna.venue.service.hospital;

import com.anpetna.venue.domain.hospital.HospitalReservationEntity;
import com.anpetna.venue.repository.hospital.HospitalReservationRepository;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

// (선택) 관리자 차단 슬롯을 함께 반영하려면 아래 import 및 주입을 활성화하세요.
// import com.anpetna.venue.repository.hospital.HospitalClosedTimeRepository;
// import com.anpetna.venue.domain.hospital.HospitalClosedTimeEntity;

@Service
@RequiredArgsConstructor
public class HospitalScheduleServiceImpl implements HospitalScheduleService {

    private final HospitalReservationRepository hospitalReservationRepository;

    // (선택) 관리자 차단 슬롯까지 반영할 경우 주석 해제
    // private final HospitalClosedTimeRepository hospitalClosedTimeRepository;

    @Override
    public List<String> listUnavailableTimes(Long doctorId, LocalDate date) {
        if (doctorId == null || date == null) return Collections.emptyList();

        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end   = date.atTime(LocalTime.MAX);

        // 1) 이미 예약된 슬롯
        List<String> reserved = hospitalReservationRepository
                .findByDoctor_DoctorIdAndAppointmentAtBetween( // ← 여기 수정
                        doctorId,
                        start,
                        end
                )
                .stream()
                .map(HospitalReservationEntity::getAppointmentAt)
                .filter(Objects::nonNull)
                .map(dt -> String.format("%02d:%02d", dt.getHour(), dt.getMinute()))
                .distinct()
                .collect(Collectors.toList());

        // 2) (선택) 관리자 차단 슬롯 포함
        // List<String> blocked = new ArrayList<>();
        // blocked.addAll(
        //     hospitalClosedTimeRepository.findByDateAndDoctorId(date, doctorId)
        //         .stream()
        //         .map(ct -> String.format("%02d:%02d", ct.getTime().getHour(), ct.getTime().getMinute()))
        //         .toList()
        // );
        // blocked.addAll(
        //     hospitalClosedTimeRepository.findByDateAndDoctorIdIsNull(date)
        //         .stream()
        //         .map(ct -> String.format("%02d:%02d", ct.getTime().getHour(), ct.getTime().getMinute()))
        //         .toList()
        // );

        // Set<String> union = new HashSet<>(reserved);
        // union.addAll(blocked);
        // return union.stream().sorted().toList();

        // 관리자 차단 기능을 아직 안 쓰면 예약된 슬롯만 반환
        return reserved.stream().sorted().collect(Collectors.toList());
    }
}
