package com.anpetna.board.dto.readOneBoard;

import com.anpetna.board.domain.BoardEntity;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReadOneBoardRes {

    private BoardEntity readOneBoard;
}
