package com.anpetna.board.dto.readComment;

import com.anpetna.coreDto.PageResponseDTO;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class ReadCommRes {

    private Long bno;
    private PageResponseDTO<CommentDTO> page;


    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    @ToString
    public static class CommentDTO {
        private Long cno;
        private String cContent;
        private String cWriter;
        private Integer cLikeCount;
    }

}
