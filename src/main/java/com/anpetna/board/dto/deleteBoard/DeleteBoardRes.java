package com.anpetna.board.dto.deleteBoard;

import com.anpetna.board.domain.BoardEntity;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DeleteBoardRes {

    private BoardEntity deleteBoard;
}
