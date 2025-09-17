package com.anpetna.notification.common.controller;

import com.anpetna.core.coreDto.PageRequestDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.notification.common.dto.MarkReadRes;
import com.anpetna.notification.common.dto.NotificationDTO;
import com.anpetna.notification.common.dto.UnreadCountRes;
import com.anpetna.notification.common.service.NotificationService;
import com.anpetna.notification.common.dto.DeleteNotificationRes;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/notification")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /** 알림 목록 조회 (전체 또는 unreadOnly=true) */
    @GetMapping
    public PageResponseDTO<NotificationDTO> list(
            @AuthenticationPrincipal(expression = "username") String me,
            PageRequestDTO pageRequestDTO,
            @RequestParam(required = false) Boolean unreadOnly
    ) {
        return notificationService.list(me, pageRequestDTO, unreadOnly);
    }

    /** 안 읽은 알림 개수 */
    @GetMapping("/unread-count")
    public UnreadCountRes unreadCount(@AuthenticationPrincipal(expression = "username") String me) {
        return notificationService.countUnread(me);
    }

    /** 알림 읽음 처리 */
    @PatchMapping("/{id}/mark-read")
    public MarkReadRes markRead(
            @AuthenticationPrincipal(expression = "username") String me,
            @PathVariable Long id
    ) {
        return notificationService.markRead(me, id);
    }

    /** 알림 삭제 */
    @DeleteMapping("/{id}")
    public DeleteNotificationRes delete(
            @AuthenticationPrincipal(expression = "username") String me,
            @PathVariable Long id
    ) {
        return notificationService.delete(me, id);
    }

    /** 실시간 알림 스트림 (SSE) */
    @GetMapping(path = "/stream", produces = "text/event-stream")
    public SseEmitter connect(
            @AuthenticationPrincipal(expression = "username") String me,
            @RequestHeader(value = "Last-Event-ID", required = false) String lastEventId
    ) {
        return notificationService.connect(me, lastEventId);
    }
}

