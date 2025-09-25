package com.anpetna.notification.common.dto;

import com.anpetna.notification.common.constant.NotificationType;
import com.anpetna.notification.common.constant.TargetType;
import com.anpetna.notification.common.constant.NotificationVariant;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CreateNotificationCmd {

    @NotNull
    private String receiverMemberId;     // 누구에게 보낼지

    private String actorMemberId;// 누가 유발했는지(없으면 null)

    @NotNull
    private NotificationType notificationType;

    private TargetType targetType;

    private String targetId;

    @NotBlank
    private String title;

    private String message;

    private String linkUrl;                       // 내부 라우팅(/items/123 같은)

    private NotificationVariant variant;
}

