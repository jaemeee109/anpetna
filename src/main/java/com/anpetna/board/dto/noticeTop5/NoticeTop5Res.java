package com.anpetna.board.dto.noticeTop5;

import com.anpetna.board.domain.BoardEntity;
import lombok.*;

import java.time.LocalDateTime;


@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class NoticeTop5Res {

    private Long bno;
    private String bWriter;
    private String bTitle;
    private LocalDateTime createDate;

    // 댓글 개수 추가
    @Builder.Default
    private int commentCount = 0;

    // Entity -> DTO 변환
    public static NoticeTop5Res from(BoardEntity boardEntity) {
        return NoticeTop5Res.builder()
                .bno(boardEntity.getBno())
                .bWriter(boardEntity.getBWriter())
                .bTitle(boardEntity.getBTitle())
                .createDate(boardEntity.getCreateDate())
                .build();

    }

    // Service에서 commentCount 주입용 setter
    public void setCommentCount(int commentCount) {
        this.commentCount = commentCount;
    }
}
