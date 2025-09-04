package com.anpetna.board.dto.readComment;

import com.anpetna.board.dto.CommentDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
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

}
