package com.anpetna.notification.common.service;

import com.anpetna.member.constant.MemberRole;
import com.anpetna.member.repository.MemberRepository;
import com.anpetna.notification.common.constant.NotificationType;
import com.anpetna.notification.common.constant.TargetType;
import com.anpetna.notification.common.dto.CreateNotificationCmd;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminNotificationService {

    private final NotificationService notificationService;
    private final MemberRepository memberRepository;

    public void broadcast(NotificationType type, TargetType targetType, String targetId) {
        List<String> admins = memberRepository.findIdsByRole(MemberRole.ADMIN);
        for (String adminId : admins) {
            notificationService.notify(adminId, type, targetType, targetId);
        }
    }

    public void broadcast(CreateNotificationCmd cmdTemplate) {
        List<String> admins = memberRepository.findIdsByRole(MemberRole.ADMIN);
        for (String admin : admins) {
            notificationService.createAndPush(
                    CreateNotificationCmd.builder()
                            .receiverMemberId(admin)                         // 수신자만 관리자별로 채워주고
                            .actorMemberId(cmdTemplate.getActorMemberId())  // 나머지는 템플릿 그대로 복사
                            .notificationType(cmdTemplate.getNotificationType())
                            .targetType(cmdTemplate.getTargetType())
                            .targetId(cmdTemplate.getTargetId())
                            .title(cmdTemplate.getTitle())
                            .message(cmdTemplate.getMessage())
                            .linkUrl(cmdTemplate.getLinkUrl())
                            .variant(cmdTemplate.getVariant())
                            .build()
            );
        }
    }

}
