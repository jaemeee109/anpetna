package com.anpetna.board.dto.createBoard;

import com.anpetna.image.dto.ImageDTO;
import lombok.*;

import java.util.List;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CreateBoardRes {

    /* private BoardEntity createBoard;*/

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
