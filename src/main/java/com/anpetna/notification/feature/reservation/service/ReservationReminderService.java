package com.anpetna.notification.feature.reservation.service;

import com.anpetna.notification.feature.reservation.domain.ReservationReminderEntity;
import com.anpetna.notification.feature.reservation.repository.ReservationReminderRepository;
import com.anpetna.venue.constant.ReservationStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
public class ReservationReminderService {

    private final ReservationReminderRepository repo;
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private void createJob(String reservationId, String memberId, LocalDateTime fireAt,
                           ReservationReminderEntity.Kind kind,
                           String serviceKind, String titleOverride) {

        String dedupe = "resv:" + reservationId + ":" + kind.name();
        if (repo.findByDedupeKey(dedupe).isPresent()) return;

        var job = ReservationReminderEntity.builder()
                .reservationId(reservationId)
                .memberId(memberId)
                .kind(kind)
                .fireAt(fireAt)
                .dedupeKey(dedupe)
                .serviceKind(serviceKind)     // 옵션
                .titleOverride(titleOverride) // 옵션
                .build();
        repo.save(job);
    }

    @Transactional
    public void cancelAll(String reservationId) {
        repo.cancelAllPendingByReservation(reservationId);
    }

    // =====================[ 병원: LocalDateTime ]=====================
    @Transactional
    public void scheduleHospital(String reservationId, String memberId,
                                 LocalDateTime startAtKst,
                                 String title24h, String title3h) {
        createJob(reservationId, memberId, startAtKst.minusHours(24),
                ReservationReminderEntity.Kind.REMIND_24H, "HOSPITAL", title24h);
        createJob(reservationId, memberId, startAtKst.minusHours(3),
                ReservationReminderEntity.Kind.REMIND_3H,  "HOSPITAL", title3h);
    }

    /** 병원 예약 상태 전이 훅 */
    @Transactional
    public void handleHospitalStatusChange(String reservationId, String memberId,
                                           LocalDateTime startAtKst,
                                           ReservationStatus newStatus,
                                           String title24h, String title3h) {
        switch (newStatus) {
            case CONFIRMED -> scheduleHospital(reservationId, memberId, startAtKst, title24h, title3h);
            case CANCELED, NOSHOW, REJECTED -> cancelAll(reservationId);
            case PENDING -> { /* no-op */ }
        }
    }

    // =====================[ 호텔: LocalDate + 체크인 시간 ]=====================
    @Transactional
    public void scheduleHotel(String reservationId, String memberId,
                              LocalDate stayDate, LocalTime checkInTimeKst,
                              String title24h, String title3h) {
        LocalDateTime checkInAt = LocalDateTime.of(stayDate, checkInTimeKst);
        createJob(reservationId, memberId, checkInAt.minusHours(24),
                ReservationReminderEntity.Kind.REMIND_24H, "HOTEL", title24h);
        createJob(reservationId, memberId, checkInAt.minusHours(3),
                ReservationReminderEntity.Kind.REMIND_3H,  "HOTEL", title3h);
    }

    /** 호텔 예약 상태 전이 훅 */
    @Transactional
    public void handleHotelStatusChange(String reservationId, String memberId,
                                        LocalDate stayDate, LocalTime checkInTimeKst,
                                        ReservationStatus newStatus,
                                        String title24h, String title3h) {
        switch (newStatus) {
            case CONFIRMED -> scheduleHotel(reservationId, memberId, stayDate, checkInTimeKst, title24h, title3h);
            case CANCELED, NOSHOW, REJECTED -> cancelAll(reservationId);
            case PENDING -> { /* no-op */ }
        }
    }

}
