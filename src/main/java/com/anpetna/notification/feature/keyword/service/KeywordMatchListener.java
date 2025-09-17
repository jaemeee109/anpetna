package com.anpetna.notification.feature.keyword.service;

import com.anpetna.board.event.BoardCreatedEvent;
import com.anpetna.notification.common.constant.NotificationType;
import com.anpetna.notification.common.constant.TargetType;
import com.anpetna.notification.common.dto.CreateNotificationCmd;
import com.anpetna.notification.common.service.NotificationService;
import com.anpetna.notification.feature.keyword.domain.KeywordSubscriptionEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class KeywordMatchListener {

    private final KeywordSubscriptionService keywordSubscriptionService; // 후보 구독 로드
    private final NotificationService notificationService;               // 기존 알림 모듈 재사용

    /**
     * 게시글 저장 트랜잭션이 '커밋된 후' 실행.
     * - 커밋이 실패하면 호출되지 않으므로 데이터 정합성 보장.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onBoardCreated(BoardCreatedEvent e) {

        if (Boolean.TRUE.equals(e.isSecret())){
            return;
        }

        // 1) 후보 구독 로드: null 스코프(전체) + 해당 보드타입 스코프
        List<KeywordSubscriptionEntity> candidates =
                keywordSubscriptionService.loadCandidatesFor(e.getBoardType());

        // 2) 비교 텍스트 구성 (대소문자/정규화 안 함 — 네 스펙)
        final String title = safe(e.getBTitle());
        final String content = safe(e.getBContent());
        final String text = title + " " + content;

        // 자기 글은 스킵하고 싶다면 true로
        final boolean skipSelf = true;
        final String authorMemberId = safe(e.getBWriter());

        // 3) 후보 순회하며 contains 매칭
        for (KeywordSubscriptionEntity sub : candidates) {
            final String kw = safe(sub.getKeyword());
            if (kw.isEmpty()) continue;

            // 자기 자신 글은 알림 제외 (옵션)
            if (skipSelf && !authorMemberId.isEmpty()
                    && authorMemberId.equals(sub.getSubscriber().getMemberId())) {
                continue;
            }

            if (text.contains(kw)) {
                // 4) 기존 알림 모듈로 알림 생성 + SSE 푸시
                try {
                    notificationService.createAndPush(
                            CreateNotificationCmd.builder()
                                    .notificationType(NotificationType.KEYWORD_MATCH) // 네 상수에 맞춰 사용
                                    .receiverMemberId(sub.getSubscriber().getMemberId())
                                    .actorMemberId(null) // 시스템/키워드 알림이면 null
                                    .targetType(TargetType.KEYWORD) // 프로젝트 상수에 맞게 조정 가능 (예: BOARD_POST)
                                    .targetId(String.valueOf(e.getBno()))
                                    .title("키워드 '" + kw + "' 가 포함된 새 게시물이 등록되었습니다.")
                                    .message(title) // 제목을 메시지로
                                    .linkUrl("/board/readOne/" + e.getBno())
                                    .build()
                    );
                } catch (Exception ex) {
                    // 리스너는 후처리이므로, 개별 실패는 로깅만 하고 다음 대상으로 진행
                    log.warn("keyword notification failed: memberId={}, keyword={}, postId={}",
                            sub.getSubscriber().getMemberId(), kw, e.getBno(), ex);
                }
            }
        }
    }

    /** null-safe helper */
    private static String safe(String s) {
        return (s == null) ? "" : s;
    }
}
