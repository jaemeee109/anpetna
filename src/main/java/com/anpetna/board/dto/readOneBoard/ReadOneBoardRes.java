package com.anpetna.board.dto.readOneBoard;

import com.anpetna.image.dto.ImageDTO;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@ToString
@AllArgsConstructor
@NoArgsConstructor
public class ReadOneBoardRes {

    /* private BoardEntity readOneBoard;*/

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
