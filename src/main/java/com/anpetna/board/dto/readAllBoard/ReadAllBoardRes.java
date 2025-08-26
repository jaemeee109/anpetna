package com.anpetna.board.dto.readAllBoard;

import com.anpetna.board.domain.BoardEntity;
import com.anpetna.board.dto.BoardDTO;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReadAllBoardRes {

    private List<BoardDTO> readAllBoard;

    private int totalPages;
    private long totalElements;
    private int currentPage;
    private Boolean noticeFlag;

}
