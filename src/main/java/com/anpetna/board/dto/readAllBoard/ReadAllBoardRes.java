package com.anpetna.board.dto.readAllBoard;

import com.anpetna.board.domain.BoardEntity;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReadAllBoardRes {

    private List<BoardEntity> readAllBoard;
    private int totalPages;
    private long totalElements;
    private int currentPage;
}
