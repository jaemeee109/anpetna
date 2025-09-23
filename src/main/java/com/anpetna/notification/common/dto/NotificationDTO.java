package com.anpetna.notification.common.dto;

import com.anpetna.notification.common.domain.NotificationEntity;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class NotificationDTO {

    private Long nId;
    private String nTitle;
    private String nMessage;
    private String targetType;
    private String targetId;
    private String linkUrl;
    private String eventId;
    private boolean isRead;
    private LocalDateTime createdAt;

    public static NotificationDTO from(NotificationEntity entity) {
        return NotificationDTO.builder()
                .nId(entity.getNId())
                .nTitle(entity.getNTitle())
                .nMessage(entity.getNMessage())
                .targetType(entity.getTargetType() == null ? null : entity.getTargetType().name())
                .targetId(entity.getTargetId())
                .linkUrl(entity.getLinkUrl())
                .eventId(entity.getEventId())
                .isRead(entity.isRead())
                .createdAt(entity.getCreatedAt())
                .build();
    }

}
