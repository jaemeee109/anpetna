package com.anpetna.board.dto.readComment;

import com.anpetna.core.coreDto.PageRequestDTO;
import lombok.*;

@Getter
@Setter
@ToString
public class ReadCommReq extends PageRequestDTO {

    // 어떤 게시글의 댓글인지
    private Long bno;

    // 정렬 기준 컬럼명 (PageRequestDTO#getPageable(String...props) 에 넣어 쓸 용도)
    private String sortBy = "cno";
}
