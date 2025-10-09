package com.anpetna.venue.controller.admin;

import com.anpetna.venue.service.hospital.HospitalScheduleService;
import com.anpetna.venue.service.hotel.HotelService;
import com.anpetna.venue.service.hospital.HospitalService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import com.anpetna.venue.dto.member.MyHospitalReservationDetail;
import com.anpetna.venue.dto.member.MyHotelReservationDetail;
import com.anpetna.venue.dto.member.MyHospitalReservationDetail;
import com.anpetna.venue.dto.member.MyHotelReservationDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

// '관리자 전용' 예약 관리
@RestController
@RequestMapping("/admin/venue")
@RequiredArgsConstructor
public class AdminVenueController {

    private final HotelService hotelService;
    private final HospitalService hospitalService;
    private final HospitalScheduleService hospitalScheduleService;

    // [호텔] 예약 확정 (PENDING -> CONFIRMED)
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/hotel/reservations/{reservationId}/confirm")
    public void confirmHotel(@PathVariable Long reservationId) {
        hotelService.confirm(reservationId);
    } //  confirmHotel 종료

    // [병원] 예약 확정 (PENDING -> CONFIRMED)
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/hospital/reservations/{reservationId}/confirm")
    public void confirmHospital(@PathVariable Long reservationId) {
        hospitalService.confirm(reservationId);
    }

    // [호텔]  노쇼 처리
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/hotel/reservations/{reservationId}/noshow")
    public void noShowHotel(@PathVariable Long reservationId) {
        hotelService.markNoShow(reservationId);
    }

    // [병원]  노쇼 처리
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/hospital/reservations/{reservationId}/noshow")
    public void noShowHospital(@PathVariable Long reservationId) {
        hospitalService.markNoShow(reservationId);
    }

    // [병원 & 호텔 ] 예약 목록 조회
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/reservations")
    public Map<String, Object> listReservations(
            @RequestParam Long venueId,
            @RequestParam(required = false) String type,       // 병원 or 호텔
            @RequestParam(required = false) String status,     // 예약 상테
            @RequestParam(required = false) String memberId,   // 회원 ID
            @RequestParam(required = false) Long doctorId,     //  병원: 의사 필터
            @RequestParam(required = false) String date,       //  YYYY-MM-DD (병원/호텔 공통)
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        final LocalDate filterDate = (date != null && !date.isBlank())
                ? LocalDate.parse(date, DateTimeFormatter.ISO_DATE)
                : null;

        List<Map<String, Object>> list = new ArrayList<>();

        // ========== 병원 목록 ==========
        if (type == null || "HOSPITAL".equalsIgnoreCase(type)) {
            var rows = hospitalService.adminList(venueId, status, memberId);

            // 날짜 / 의사 필터
            if (filterDate != null || doctorId != null) {
                LocalDateTime start = (filterDate != null) ? filterDate.atStartOfDay() : null;
                LocalDateTime end   = (filterDate != null) ? filterDate.plusDays(1).atStartOfDay().minusNanos(1) : null;

                rows = rows.stream().filter(r -> {
                    if (doctorId != null && (r.getDoctorId() == null || !doctorId.equals(r.getDoctorId()))) {
                        return false;
                    }
                    if (filterDate != null) {
                        var appt = r.getAppointmentAt();
                        if (appt == null) return false;
                        return !appt.isBefore(start) && !appt.isAfter(end);
                    }
                    return true;
                }).toList();
            }

            for (var r : rows) {
                var m = new java.util.HashMap<String, Object>();
                m.put("type", "HOSPITAL");
                m.put("reservationId", r.getReservationId());
                m.put("status", r.getStatus().name());
                m.put("venueName", r.getVenueName());
                m.put("memberId", r.getMemberId());
                m.put("reserverName", r.getReserverName());
                m.put("petName", r.getPetName());
                m.put("primaryPhone", r.getPrimaryPhone());
                m.put("doctorId", r.getDoctorId());
                m.put("doctorName", r.getDoctorName());
                m.put("appointment_at", r.getAppointmentAt());
                m.put("createdAt", r.getCreatedAt());
                list.add(m);
            }
        }

        // ========== 호텔 목록 ==========
        if (type == null || "HOTEL".equalsIgnoreCase(type)) {
            var rows = hotelService.adminList(venueId, status, memberId);

            //  날짜 필터 ( 체크인, 체크아웃 )
            if (filterDate != null) {
                rows = rows.stream().filter(r -> {
                    var in  = r.getCheckIn();
                    var out = r.getCheckOut();
                    if (in == null || out == null) return false;
                    return (in.isEqual(filterDate) || in.isBefore(filterDate))
                            && (out.isEqual(filterDate) || out.isAfter(filterDate));
                }).toList();
            }

            for (var r : rows) {
                var m = new java.util.HashMap<String, Object>();
                m.put("type", "HOTEL");
                m.put("reservationId", r.getReservationId());
                m.put("status", r.getStatus().name());
                m.put("venueName", r.getVenueName());
                m.put("memberId", r.getMemberId());
                m.put("reserverName", r.getReserverName());
                m.put("petName", r.getPetName());
                m.put("primaryPhone", r.getPrimaryPhone());
                m.put("checkIn", r.getCheckIn());
                m.put("checkOut", r.getCheckOut());
                m.put("createdAt", r.getCreatedAt());
                list.add(m);
            }
        }

        // 메모리 페이징
        int from = Math.max(page, 0) * Math.max(size, 1);
        int to   = Math.min(from + Math.max(size, 1), list.size());
        var content = (from < to) ? list.subList(from, to) : List.<java.util.Map<String, Object>>of();

        var res = new HashMap<String, Object>();
        res.put("content", content);
        res.put("totalElements", list.size());
        res.put("totalPages", (int) Math.ceil(list.size() / (double) Math.max(size, 1)));
        res.put("pageNumber", page);
        res.put("pageSize", size);
        return res;
        
    } // listReservations 종료


    // 예약 상태 일괄 변경
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/reservations/status")
    public Map<String, Object> bulkUpdateStatus(@RequestBody Map<String, Object> body) {
        var ids  = (java.util.List<?>) body.getOrDefault("ids", List.of());
        var next = String.valueOf(body.get("status"));
        var type = String.valueOf(body.getOrDefault("type", "")); // 병원 or 호텔

        int updated = 0;
        boolean hospitalFirst = "HOSPITAL".equalsIgnoreCase(type);

        // 각 ID별로 상태변경 시도
        for (var idObj : ids) {
            Long id = null;
            try { id = Long.valueOf(String.valueOf(idObj)); } catch (Exception ignore) {}
            if (id == null) continue;

            boolean ok = false;
            if (hospitalFirst) {
                try { ok = hospitalService.tryUpdateStatus(id, next); } catch (Exception ignore) {}
                if (!ok) {
                    try { ok = hotelService.tryUpdateStatus(id, next); } catch (Exception ignore) {}
                }
            } else {
                try { ok = hotelService.tryUpdateStatus(id, next); } catch (Exception ignore) {}
                if (!ok) {
                    try { ok = hospitalService.tryUpdateStatus(id, next); } catch (Exception ignore) {}
                }
            }
            if (ok) updated++;
        }
        return Map.of("updated", updated);

    } //  bulkUpdateStatus 종료


    // [병원] 특정 의사 , 특정 날짜 예약 슬롯 마감 설정
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/hospital/closed-times")
    public void setClosedTimes(@RequestBody Map<String, Object> body) {
        Long doctorId = null;
        try { doctorId = Long.valueOf(String.valueOf(body.get("doctorId"))); } catch (Exception ignore) {}
        String dateStr = String.valueOf(body.get("date"));
        @SuppressWarnings("unchecked")
        List<String> close = (List<String>) body.getOrDefault("close", List.of());

        if (doctorId == null || dateStr == null || dateStr.isBlank()) {
            throw new IllegalArgumentException("doctorId, date 는 필수입니다.");
        }
        LocalDate date = LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE);

        // 서비스에서 검증 후 저장
        hospitalScheduleService.setClosedTimes(doctorId, date, close);
        
    } // setClosedTimes 종료


    // [병원] 예약 상세 조회
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/reservations/hospital/{id}")
    public ResponseEntity<MyHospitalReservationDetail> adminReadHospital(@PathVariable("id") Long id) {
        return ResponseEntity.ok(hospitalService.adminReadDetail(id));
    } // adminReadHospital 종료

    
    // [호텔] 예약 상세 조회
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/reservations/hotel/{id}")
    public ResponseEntity<MyHotelReservationDetail> adminReadHotel(@PathVariable("id") Long id) {
        return ResponseEntity.ok(hotelService.adminReadDetail(id));
    } // adminReadHotel 종료



} // AdminVenueController Class 종료
