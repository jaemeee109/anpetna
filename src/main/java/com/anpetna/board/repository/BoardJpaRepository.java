package com.anpetna.board.repository;

import com.anpetna.board.constant.BoardType;
import com.anpetna.board.domain.BoardEntity;
import com.anpetna.board.repository.search.BoardSearch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
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

    // ====== 좋아요 카운트: 원자적 증감 쿼리 ======
    @Modifying(clearAutomatically = false, flushAutomatically = false)
    @Query("update BoardEntity b set b.bLikeCount = b.bLikeCount + 1 where b.bno = :bno")
        // 게시글 좋아요 +1 (단일 SQL로 원자적 증가 → 동시 클릭에도 안전)
        // 반환값: 영향받은 행 수(정상 1). 대상 없음 등 예외 상황이면 0.
    int incBoardLike(@Param("bno") Long bno);

    @Modifying(clearAutomatically = false, flushAutomatically = false)
    @Query("""
              update BoardEntity b
              set b.bLikeCount = case when b.bLikeCount > 0 then b.bLikeCount - 1 else 0 end
              where b.bno = :bno
            """)
        // 게시글 좋아요 -1 (하한 0 보장 → 음수 방지)
    int decBoardLike(@Param("bno") Long bno);
}

// @Param("boardType")의 의미는
// 쿼리문 안에서의 :boardType은 "쿼리 안에서 내가 매핑할 자리"라는 뜻이고,
//@Param("boardType")은 "이 메서드 파라미터랑 저 쿼리 파라미터를 연결하겠다"
//즉, JPQL 변수명(:boardType) ↔ 메서드 매개변수(boardType) 를 연결하는 다리 역할.

// 왜 둘 다(게시글/댓글) 레포지토리에 증감 메서드를 추가해야 하나?
//토글 동작의 본질:
//Like 테이블에 INSERT(좋아요) 또는 DELETE(취소)한 뒤,
//해당 대상의 집계 컬럼(bLikeCount/cLikeCount)을 즉시 반영해야 프론트가 일관된 숫자를 본다.
//원자적 UPDATE가 필요한 이유:
//멀티탭/더블클릭/트래픽 경쟁 상황에서 단순 get/set은 lost update를 야기.
//UPDATE ... SET cnt = cnt + 1는 DB가 원자적으로 처리 → 중복 클릭에도 정확.

// 토글(toggle) = “현재 상태를 보고 반대 상태로 뒤집는 동작”. 예) 좋아요가 꺼져있으면 → 켜기, 켜져있으면 → 끄기.
