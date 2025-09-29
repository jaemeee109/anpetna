package com.anpetna.notification.feature.stock.service;

import com.anpetna.item.domain.ItemEntity;
import com.anpetna.notification.common.constant.NotificationType;
import com.anpetna.notification.common.constant.TargetType;
import com.anpetna.notification.common.dto.CreateNotificationCmd;
import com.anpetna.notification.common.service.AdminNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StockLowNotificationService {

    private final AdminNotificationService adminNotificationService;

    public void notifyStockLow(ItemEntity item, int next) {
        if (next > 5) return;

        String targetId = item.getItemId().toString();
        String title    = item.getItemName() + "의 재고가 " + next + "개 남았습니다. 보충해주세요.";
        String linkUrl  = "/item/" + item.getItemId() + "/edit";

        adminNotificationService.broadcast(
                CreateNotificationCmd.builder()
                        .receiverMemberId(null)                 // AdminNotificationService에서 채움
                        .actorMemberId(null)                    // 시스템 알림이면 null
                        .notificationType(NotificationType.STOCK_LOW)
                        .targetType(TargetType.ITEM)
                        .targetId(targetId)
                        .title(title)
                        .message(null)
                        .linkUrl(linkUrl)
                        .build()
        );
    }
}
