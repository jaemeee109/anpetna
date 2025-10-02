package com.anpetna.notification.feature.reservation.repository;

import com.anpetna.notification.feature.reservation.domain.ReservationReminderEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ReservationReminderRepository extends JpaRepository<ReservationReminderEntity, Long> {

    Optional<ReservationReminderEntity> findByDedupeKey(String dedupeKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
           select r from ReservationReminderEntity r
            where r.status = 'PENDING' and r.fireAt <= :now
            order by r.fireAt asc
           """)
    List<ReservationReminderEntity> pickDueJobsForUpdate(@Param("now") LocalDateTime now);

    @Modifying
    @Query("""
           update ReservationReminderEntity r
              set r.status='CANCELLED'
            where r.reservationId=:reservationId and r.status='PENDING'
           """)
    int cancelAllPendingByReservation(@Param("reservationId") String reservationId);

}
