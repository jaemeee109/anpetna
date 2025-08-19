package com.anpetna.board.repository.search;

import com.anpetna.board.domain.BoardEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface BoardSearch {

    Page<BoardEntity> search(Pageable pageable, String[] types, String keyword);
}
