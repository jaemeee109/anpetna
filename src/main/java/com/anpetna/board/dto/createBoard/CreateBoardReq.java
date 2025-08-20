package com.anpetna.board.dto.createBoard;

import com.anpetna.board.constant.BoardType;
import com.anpetna.coreDto.ImageDTO;
import lombok.*;

import java.util.List;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CreateBoardReq {

    private String bWriter;          // 작성자
    private String bTitle;           // 제목
    private String bContent;         // 내용
    private BoardType boardType;    // 게시글 타입 (NOTICE, FAQ, FREE, QNA, REVIEW, EVENT)
    private Boolean noticeFlag;     // 상단 고정 여부 (초기값 = false)
    private Boolean isSecret;       // 비밀글 여부 (초기값 = false)
    private List<ImageDTO> images;
    // 기본값 0
    @Builder.Default
    private Integer bViewCount = 0;
    @Builder.Default
    private Integer bLikeCount = 0;


}


