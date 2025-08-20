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

}
