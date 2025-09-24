package com.anpetna.board.event;

import com.anpetna.board.constant.BoardType;
import lombok.Builder;
import lombok.Getter;

/**
 * 게시글 생성이 성공적으로 완료된 후 발행되는 도메인 이벤트.
 * - AFTER_COMMIT 단계에서 리스너가 구독하여 알림, 통계 등 후처리 가능
 */
@Getter
public class BoardCreatedEvent {

    private final Long bno;             // 게시물 번호 (PK)
    private final BoardType boardType;  // 게시물 종류
    private final String bWriter;       // 작성자 memberId (자기 글 알림 제외용)
    private final String bTitle;        // 제목
    private final String bContent;      // 내용
    private final boolean isSecret;

    @Builder
    public BoardCreatedEvent(Long bno,
                             BoardType boardType,
                             String bWriter,
                             String bTitle,
                             String bContent,
                             boolean isSecret) {
        this.bno = bno;
        this.boardType = boardType;
        this.bWriter = bWriter;
        this.bTitle = bTitle;
        this.bContent = bContent;
        this.isSecret = isSecret;
    }
}
