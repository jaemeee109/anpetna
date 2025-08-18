package com.anpetna.board.repository;

import com.anpetna.board.domain.BoardEntity;
import com.anpetna.board.repository.search.BoardSearch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoardJpaRepository extends JpaRepository<BoardEntity, Long>, BoardSearch {

    // Jpa Repository 에서 CRUD 제공

    // 커스텀 Query 추가시 Interface 구현후 상속받으면 됨

    Page<BoardEntity> findAll(Pageable pageable);
    // 페이징 + 전체 게시글 조회

}
