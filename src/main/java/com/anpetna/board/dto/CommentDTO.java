package com.anpetna.board.dto;

import com.anpetna.board.domain.CommentEntity;
import lombok.*;

@Getter @Setter @Builder
@AllArgsConstructor @NoArgsConstructor @ToString
public class CommentDTO {
    private Long cno;
    private Long bno;        // board의 PK만 노출
    private String cWriter;
    private String cContent;
    private Integer cLikeCount;

    public static CommentDTO fromEntity(CommentEntity commentEntity) {
        return CommentDTO.builder()
                .cno(commentEntity.getCno())
                .bno(commentEntity.getBoard() != null ? commentEntity.getBoard().getBno() : null)
                .cWriter(commentEntity.getCWriter())
                .cContent(commentEntity.getCContent())
                .cLikeCount(commentEntity.getCLikeCount())
                .build();
    }
}
