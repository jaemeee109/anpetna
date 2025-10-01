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
}
/**
 * 메인 홈 인기상품 조회 응답 DTO
 * 항상 Top-5 기준
 * 가장 기본적인 정보만 포함
 */