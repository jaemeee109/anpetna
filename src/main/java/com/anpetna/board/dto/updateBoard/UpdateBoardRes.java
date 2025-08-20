package com.anpetna.board.dto.updateBoard;

import com.anpetna.board.domain.BoardEntity;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UpdateBoardRes {

    private BoardEntity updateBoard;
}
