package com.anpetna.notification.common.service;

import com.anpetna.core.coreDto.PageRequestDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.notification.common.constant.NotificationType;
import com.anpetna.notification.common.constant.TargetType;
import com.anpetna.notification.common.dto.CreateNotificationCmd;
import com.anpetna.notification.common.dto.MarkReadRes;
import com.anpetna.notification.common.dto.NotificationDTO;
import com.anpetna.notification.common.dto.UnreadCountRes;
import com.anpetna.notification.common.dto.DeleteNotificationRes;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

public interface NotificationService {

    PageResponseDTO<NotificationDTO> list(String receiverMemberId, PageRequestDTO pageRequestDTO, Boolean unreadOnly);

    UnreadCountRes countUnread(String receiverMemberId);

    MarkReadRes markRead(String receiverMemberId, Long notiId);

    DeleteNotificationRes delete(String receiverMemberId, Long notiId);

    SseEmitter connect(String receiverMemberId, String lastEventId);

    NotificationDTO createAndPush(CreateNotificationCmd cmd);
    void notify(String receiverMemberId, NotificationType type, TargetType targetType, String targetId);
}
