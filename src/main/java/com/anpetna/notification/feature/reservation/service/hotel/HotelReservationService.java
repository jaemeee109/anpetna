package com.anpetna.notification.feature.reservation.service.hotel;

import com.anpetna.member.domain.MemberEntity;
import com.anpetna.notification.common.constant.NotificationType;
import com.anpetna.notification.common.constant.TargetType;
import com.anpetna.notification.common.dto.CreateNotificationCmd;
import com.anpetna.notification.common.service.NotificationService;
import com.anpetna.venue.domain.VenueEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class HotelReservationService {

    private final NotificationService notificationService;

    public void notifyHotelReservation(MemberEntity member, String memberId, VenueEntity venue, LocalDate in, LocalDate out) {

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM월 dd일");
        String formattedIn = in.format(formatter);
        String formattedOut = out.format(formatter);

        String title = member.getMemberName() + " 회원님, " + formattedIn + " ~ " + formattedOut + "에 안펫나 호텔 " + venue.getVenueName() + " 예약이 접수되었습니다. 예약은 추후 확정 또는 취소 여부가 안내될 예정입니다.";

        notificationService.createAndPush(
                CreateNotificationCmd.builder()
                        .receiverMemberId(memberId)
                        .notificationType(NotificationType.RESERVATION_HOTEL)
                        .targetType(TargetType.RESERVATION)
                        .targetId(venue.getVenueId().toString())
                        .title(title)
                        .build()
        );

    }

}
