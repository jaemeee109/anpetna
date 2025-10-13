package com.anpetna.board.repository;

import com.anpetna.board.domain.CommentEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommentJpaRepository extends JpaRepository<CommentEntity, Long> {

    Page<CommentEntity> findByBoard_Bno(Long bno, Pageable pageable);

    // ====== 좋아요 카운트: 원자적 증감 쿼리 ======

    @Modifying(clearAutomatically = false, flushAutomatically = false)
    @Query("update CommentEntity c set c.cLikeCount = c.cLikeCount + 1 where c.cno = :cno")
        // 댓글 좋아요 +1 (단일 SQL → 동시성 안정)
    int incCommentLike(@Param("cno") Long cno);

    @Modifying(clearAutomatically = false, flushAutomatically = false)
    @Query("""
              update CommentEntity c
              set c.cLikeCount = case when c.cLikeCount > 0 then c.cLikeCount - 1 else 0 end
              where c.cno = :cno
            """)
        // 댓글 좋아요 -1 (하한 0 보장)
    int decCommentLike(@Param("cno") Long cno);

    @Query("SELECT COUNT(c) FROM CommentEntity c WHERE c.board.bno = :bno")
    long countByBoardId(@Param("bno") Long bno);
}
/**
 * 댓글 JPA 레포지토리
 * - 목록 조회, 게시글별 페이징
 * - 좋아요 카운트도 게시글과 동일한 방식으로 '원자적 증감'
 */

// 왜 둘 다(게시글/댓글) 레포지토리에 증감 메서드를 추가해야 하나?
//토글 동작의 본질:
//Like 테이블에 INSERT(좋아요) 또는 DELETE(취소)한 뒤,
//해당 대상의 집계 컬럼(bLikeCount/cLikeCount)을 즉시 반영해야 프론트가 일관된 숫자를 본다.
//원자적 UPDATE가 필요한 이유:
//멀티탭/더블클릭/트래픽 경쟁 상황에서 단순 get/set은 lost update를 야기.
//UPDATE ... SET cnt = cnt + 1는 DB가 원자적으로 처리 → 중복 클릭에도 정확.