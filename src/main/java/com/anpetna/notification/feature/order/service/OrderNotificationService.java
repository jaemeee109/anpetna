package com.anpetna.notification.feature.order.service;

import com.anpetna.notification.common.constant.NotificationType;
import com.anpetna.notification.common.constant.TargetType;
import com.anpetna.notification.common.dto.CreateNotificationCmd;
import com.anpetna.notification.common.service.NotificationService;
import com.anpetna.order.domain.OrdersEntity;
import com.anpetna.order.repository.OrdersRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;

@Log4j2
@Service
@RequiredArgsConstructor
public class OrderNotificationService {

    private final NotificationService notificationService;
    private final OrdersRepository ordersRepository;

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

    public void notifyOrderFail(String orderId) {
        try {
            Long ordersId = parseOrdersId(orderId); // "ANP-{ordersId}-{ts}" → {ordersId}
            OrdersEntity order = ordersRepository.findById(ordersId).orElse(null);
            if (order == null || order.getMemberId() == null) {
                log.warn("[Notify] order not found for tossOrderId={}", orderId);
                return;
            }

            String receiverId    = order.getMemberId().getMemberId();
            String targetOrderId = String.valueOf(order.getOrdersId()); // 프론트 /orders/[orderId] 규격

            notificationService.createAndPush(
                    CreateNotificationCmd.builder()
                            .receiverMemberId(receiverId)
                            .notificationType(NotificationType.PAYMENT_FAIL)
                            .targetType(TargetType.PAYMENT)
                            .targetId(targetOrderId)
                            .title("결제가 실패했습니다.") // 실패 문구 고정
                            .build()
            );
        } catch (Exception ex) {
            // 알림 실패가 결제 에러 흐름을 덮지 않도록 삼킵니다.
            log.warn("[Notify] payment-fail notify skipped: {}", ex.toString());
        }
    }

    // ★ 내부 헬퍼: 토스용 orderId 문자열 파싱
    private Long parseOrdersId(String orderId) {
        String[] parts = orderId.split("-");
        if (parts.length < 3) throw new IllegalArgumentException("orderId 형식 오류: " + orderId);
        return Long.parseLong(parts[1]);
    }

}
