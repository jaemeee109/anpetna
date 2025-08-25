package com.anpetna.board.repository;

import com.anpetna.board.constant.BoardType;
import com.anpetna.board.domain.BoardEntity;
import com.anpetna.board.repository.search.BoardSearch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BoardJpaRepository extends JpaRepository<BoardEntity, Long>, BoardSearch {

    // Jpa Repository 에서 CRUD 제공

    // 커스텀 Query 추가시 Interface 구현후 상속받으면 됨

    Page<BoardEntity> findAll(Pageable pageable);
    // 페이징 + 전체 게시글 조회
    @Query("""
      select b
      from BoardEntity b
      where (:boardType is null or :boardType = '' or upper(b.boardType) = upper(:boardType))
      order by b.noticeFlag desc, b.createDate desc
    """)
    Page<BoardEntity> findByBoardTypeSafe(
            @Param("boardType") String boardType,
            Pageable pageable
    );

    Page<BoardEntity> findByBoardTypeAndFaqCategory(BoardType type, String faqCategory, Pageable pageable); // ★ ADD
    //★ 추가

    Page<BoardEntity> findByBoardTypeAndFaqCategoryContainingIgnoreCase(BoardType type, String faqCategory, Pageable pageable);
    //★ 추가, 부분검색 대소문자 무시
}
