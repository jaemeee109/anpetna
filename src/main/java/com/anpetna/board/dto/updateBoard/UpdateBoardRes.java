package com.anpetna.board.dto.updateBoard;

import com.anpetna.board.domain.BoardEntity;
import com.anpetna.coreDto.ImageDTO;
import lombok.*;

import java.util.List;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UpdateBoardRes {

    /*private BoardEntity updateBoard;*/

    private Long bno;
    private String bTitle;
    private String bWriter;
    private String bContent;
    private Integer bLikeCount;
    private java.time.LocalDateTime createDate;
    private java.time.LocalDateTime latestDate;

    private Boolean noticeFlag;
    private Boolean isSecret;

    private List<ImageDTO> images;
}
