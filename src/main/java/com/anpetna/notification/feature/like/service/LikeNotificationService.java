package com.anpetna.notification.feature.like.service;

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
public class LikeNotificationService {

    private final NotificationService notificationService;

    public void notifyBoardLike(BoardEntity entity, String memberId){

        String boardAuthorId = entity.getBWriter();

        String title = boardAuthorId + "님의 게시글에 " + memberId + "님이 좋아요를 눌렀습니다.";
        String linkUrl = "/board/readOne/" + entity.getBno();

        notificationService.createAndPush(
                CreateNotificationCmd.builder()
                        .receiverMemberId(boardAuthorId)
                        .actorMemberId(memberId)
                        .notificationType(NotificationType.POST_LIKE)
                        .targetType(TargetType.POST_LIKE)
                        .targetId(entity.getBno().toString())
                        .title(title)
                        .message(entity.getBContent())
                        .linkUrl(linkUrl)
                        .build()
        );

    }

    public void notifyCommentLike(CommentEntity entity, String memberId){

        Long bno = entity.getBoard().getBno();

        String commentAuthorId = entity.getCWriter();
        String title = commentAuthorId + "님의 댓글에 " + memberId + "님이 좋아요를 눌렀습니다.";
        String linkUrl = "/board/readOne/" + bno;

        notificationService.createAndPush(
                CreateNotificationCmd.builder()
                        .receiverMemberId(commentAuthorId)
                        .actorMemberId(memberId)
                        .notificationType(NotificationType.COMMENT_LIKE)
                        .targetType(TargetType.COMMENT_LIKE)
                        .targetId(entity.getCno().toString())
                        .title(title)
                        .message(entity.getCContent())
                        .linkUrl(linkUrl)
                        .build()
        );

    }

}