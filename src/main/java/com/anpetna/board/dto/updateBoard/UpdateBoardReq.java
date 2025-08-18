package com.anpetna.board.dto.updateBoard;

import com.anpetna.coreDto.ImageDTO;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UpdateBoardReq {

    private Long bno;
    private String bTitle;
    private String bContent;

    private List<ImageDTO> images;
}
