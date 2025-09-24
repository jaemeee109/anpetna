package com.anpetna.notification.feature.order.service;

import com.anpetna.notification.common.constant.NotificationType;
import com.anpetna.notification.common.constant.TargetType;
import com.anpetna.notification.common.dto.CreateNotificationCmd;
import com.anpetna.notification.common.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OrderNotificationService {

    private final NotificationService notificationService;

    public void notifyOrderSuccess(String memberId, Integer totalAmount, String orderId){

        String title = memberId + "님, " + totalAmount + "원이 결제되었습니다.";

        notificationService.createAndPush(
                CreateNotificationCmd.builder()
                        .receiverMemberId(memberId)
                        .notificationType(NotificationType.PAYMENT_DONE)
                        .targetType(TargetType.PAYMENT)
                        .targetId(orderId)
                        .title(title)
                        .build()
        );

    }
}
