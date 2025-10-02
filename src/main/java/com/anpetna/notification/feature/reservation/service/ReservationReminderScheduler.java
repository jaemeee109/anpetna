package com.anpetna.notification.feature.reservation.service;

import com.anpetna.notification.common.constant.NotificationType;
import com.anpetna.notification.common.constant.TargetType;
import com.anpetna.notification.common.dto.CreateNotificationCmd;
import com.anpetna.notification.common.service.NotificationService;
import com.anpetna.notification.feature.reservation.domain.ReservationReminderEntity;
import com.anpetna.notification.feature.reservation.repository.ReservationReminderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Log4j2
@Service
@RequiredArgsConstructor
public class ReservationReminderScheduler {

    private final ReservationReminderRepository repo;
    private final NotificationService notificationService;

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @Scheduled(fixedDelay = 60_000L, initialDelay = 15_000L)
    @Transactional
    public void tick() {
        var now = LocalDateTime.now(KST);
        var jobs = repo.pickDueJobsForUpdate(now);

        for (var job : jobs) {
            try {
                NotificationType type = (job.getKind() == ReservationReminderEntity.Kind.REMIND_24H)
                        ? NotificationType.RESERVATION_REMINDER_24H
                        : NotificationType.RESERVATION_REMINDER_3H;

                // 스케줄 시 저장된 타이틀이 있으면 그것을 그대로 사용
                String title = (job.getTitleOverride() != null && !job.getTitleOverride().isBlank())
                        ? job.getTitleOverride()
                        : (type == NotificationType.RESERVATION_REMINDER_24H
                        ? "[예약 D-1] 내일 방문 일정이 있습니다."
                        : "[예약 임박] 3시간 후 예약입니다.");

                var cmd = CreateNotificationCmd.builder()
                        .receiverMemberId(job.getMemberId())
                        .notificationType(type)
                        .targetType(TargetType.RESERVATION)
                        .targetId(job.getReservationId())
                        .title(title)
                        .build();

                notificationService.createAndPush(cmd);
                job.setStatus(ReservationReminderEntity.Status.SENT);

            } catch (Exception e) {
                log.warn("[Reminder] send failed: jobId={}, err={}", job.getRId(), e.toString());
                job.setStatus(ReservationReminderEntity.Status.FAILED);
            }
        }
    }

}
