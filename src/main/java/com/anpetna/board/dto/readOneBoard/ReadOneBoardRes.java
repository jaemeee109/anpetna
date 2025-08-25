package com.anpetna.board.dto.readOneBoard;

import com.anpetna.board.domain.BoardEntity;
import lombok.*;

@Getter
@Setter
@Builder
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
}
