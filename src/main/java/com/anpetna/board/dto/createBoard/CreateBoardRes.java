package com.anpetna.board.dto.createBoard;

import com.anpetna.board.domain.BoardEntity;
import lombok.*;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CreateBoardRes {

    private BoardEntity createBoard;
}
