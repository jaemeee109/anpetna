package com.anpetna.board.dto.deleteBoard;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DeleteBoardReq {

    private Long bno;
}
