package com.anpetna.board.repository;

import com.anpetna.board.constant.BoardType;
import com.anpetna.board.domain.BoardEntity;
import com.anpetna.board.repository.search.BoardSearch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

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
        // 고정글 상단 고정 용
    Page<BoardEntity> findByBoardTypeSafe(
            @Param("boardType") String boardType,
            Pageable pageable
    );

    Page<BoardEntity> findByBoardTypeAndCategory(BoardType type, String category, Pageable pageable); // ★ ADD
    //★ 추가

    Page<BoardEntity> findByBoardTypeAndCategoryContainingIgnoreCase(BoardType type, String category, Pageable pageable);
    //★ 추가, 부분검색 대소문자 무시

    // NOTICE 중에서 최신순 5개 뽑아오는 쿼리문
    @Query("""
            select b
            from BoardEntity b
            where b.boardType = :boardType
            order by b.createDate desc
            """)
    List<BoardEntity> noticeCreateDateTop5(@Param("boardType") BoardType boardType, Pageable pageable);

    // FREE 게시물 중 좋아요 많은순 5개
    @Query("""
            select b
            from BoardEntity b
            where b.boardType = :boardType
            order by b.bLikeCount desc, b.createDate desc
            """)
    List<BoardEntity> freeLikeCountTop5(@Param("boardType") BoardType boardType, Pageable pageable);
}

// @Param("boardType")의 의미는
// 쿼리문 안에서의 :boardType은 "쿼리 안에서 내가 매핑할 자리"라는 뜻이고,
//@Param("boardType")은 "이 메서드 파라미터랑 저 쿼리 파라미터를 연결하겠다"
//즉, JPQL 변수명(:boardType) ↔ 메서드 매개변수(boardType) 를 연결하는 다리 역할.
