package com.anpetna.board.dto.createComment;

import lombok.*;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CreateCommReq {

    private Long bno;          // 어느 게시글(bno)에 다는 댓글인지 (FK)
    private String cWriter;    // 작성자
    private String cContent;   // 내용

    @Builder.Default
    private Integer cLikeCount = 0; // 좋아요 기본값
}
