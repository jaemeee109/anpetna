package com.anpetna.board.repository.search;

import com.anpetna.board.constant.BoardType;
import com.anpetna.board.domain.BoardEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface BoardSearch {

    Page<BoardEntity> search(Pageable pageable, String[] types, String keyword);

    // ★ NEW: boardType까지 where에 포함하는 검색
    Page<BoardEntity> searchByBoardType(Pageable pageable, BoardType boardType, String[] types, String keyword);
}
