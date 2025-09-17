package com.anpetna.notification.feature.comment.service;

import com.anpetna.board.domain.BoardEntity;
import com.anpetna.board.domain.CommentEntity;
import com.anpetna.notification.common.constant.NotificationType;
import com.anpetna.notification.common.constant.TargetType;
import com.anpetna.notification.common.dto.CreateNotificationCmd;
import com.anpetna.notification.common.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommentNotificationService {

    private final NotificationService notificationService;

    public void notifyCommentCreated(BoardEntity boardRef, CommentEntity comment, String actorMemberId) {
        String postAuthorID = boardRef.getBWriter();
        if (postAuthorID.equals(actorMemberId)) {
            return; // 자기 글에 자기 댓글 → 알림 생략
        }

        String title = postAuthorID + "회원님, 게시물에 새로운 댓글이 달렸습니다.";
        String linkUrl = "/board/readOne/" + boardRef.getBno();

        notificationService.createAndPush(
                CreateNotificationCmd.builder()
                        .receiverMemberId(postAuthorID)
                        .actorMemberId(actorMemberId)
                        .notificationType(NotificationType.COMMENT)
                        .targetType(TargetType.COMMENT)
                        .targetId(boardRef.getBno().toString())
                        .title(title)
                        .message(comment.getCContent())
                        .linkUrl(linkUrl)
                        .build()
        );
    }
}
