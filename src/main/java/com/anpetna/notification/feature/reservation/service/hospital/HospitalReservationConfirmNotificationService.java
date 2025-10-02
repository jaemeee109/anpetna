package com.anpetna.notification.feature.reservation.service.hospital;

import com.anpetna.member.domain.MemberEntity;
import com.anpetna.notification.common.constant.NotificationType;
import com.anpetna.notification.common.constant.TargetType;
import com.anpetna.notification.common.dto.CreateNotificationCmd;
import com.anpetna.notification.common.service.NotificationService;
import com.anpetna.venue.domain.VenueEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class HospitalReservationConfirmNotificationService {

    private final NotificationService notificationService;

    public void notifyHospitalReservationConfirm(MemberEntity member, String memberId, VenueEntity venue, LocalDateTime at) {

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM월 dd일 HH시 mm분");
        String formattedAt = at.format(formatter);

        String title = member.getMemberName() + " 회원님, " + formattedAt + " 안펫나 동물병원 " + venue.getVenueName() + " 예약이 확정되었습니다.";

        notificationService.createAndPush(
                CreateNotificationCmd.builder()
                        .receiverMemberId(memberId)
                        .notificationType(NotificationType.RESERVATION_HOSPITAL_CONFIRM)
                        .targetType(TargetType.RESERVATION)
                        .targetId(venue.getVenueId().toString())
                        .title(title)
                        .build()
        );

    }

}
