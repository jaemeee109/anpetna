package com.anpetna.board.dto.likeCountTop5;

import com.anpetna.board.domain.BoardEntity;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class LikeCountTop5Res {

    private Long bno;
    private String bWriter;
    private String bTitle;
    private LocalDateTime createDate;
    private Integer bLikeCount;

    // 댓글 개수 추가
    @Builder.Default
    private int commentCount = 0;

    // Entity -> DTO 변환
    public static LikeCountTop5Res from(BoardEntity boardEntity) {
        return LikeCountTop5Res.builder()
                .bno(boardEntity.getBno())
                .bWriter(boardEntity.getBWriter())
                .bTitle(boardEntity.getBTitle())
                .createDate(boardEntity.getCreateDate())
                .bLikeCount(boardEntity.getBLikeCount())
                .build();

    }

    // ✅ Service 에서 commentCount 주입용 setter
    public void setCommentCount(int commentCount) {
        this.commentCount = commentCount;
    }
}
/**
 * 메인 홈 인기상품 조회 응답 DTO
 * 항상 Top-5 기준
 * 가장 기본적인 정보만 포함
 */