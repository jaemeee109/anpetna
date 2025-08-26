package com.anpetna.board.dto.readAllBoard;

import lombok.*;

@Getter
@Setter
/*@Builder
@AllArgsConstructor*/
@NoArgsConstructor
public class ReadAllBoardReq {


    private Integer page;
    private Integer size;
    private String boardType;

    // 정렬 조건 (예: "createDate,desc")
    private String sortBy;

    /**
     * 체이닝 헬퍼: listReq.sortBy("createDate,desc") 지원
     */
    public ReadAllBoardReq sortBy(String sortBy) {
        this.sortBy = sortBy;
        return this;
    }

}
