package com.anpetna.board.repository;

import com.anpetna.board.constant.LikeTargetType;
import com.anpetna.board.domain.LikeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LikeJpaRepository extends JpaRepository<LikeEntity, Long> {
    /**
     * 특정 대상(B→게시글, C→댓글)에 대해, 해당 사용자가 좋아요를 눌렀는지 단건 조회.
     * - 사용처: "토글" 진입 시 이미 눌렀는지 여부 판단
     * - 반환: Optional<LikeEntity> (있으면 present)
     */
    Optional<LikeEntity> findByTargetTypeAndTargetIdAndMemberId(
            LikeTargetType targetType, Long targetId, String memberId);

    /**
     * 존재 여부만 빠르게 확인하는 버전.
     * - exists는 JPQL "select count" 형태로 최적화되어 빠른 편.
     * - 동시성/멱등성 보조 체크에 유용(예: INSERT 실패 후 최종 상태 확인).
     */
    boolean existsByTargetTypeAndTargetIdAndMemberId(
            LikeTargetType targetType, Long targetId, String memberId);

    /**
     * 특정 대상의 총 좋아요 수 조회.
     * - 리스트 화면에서는 이 메서드를 다건 IN 쿼리로 바꾸는 게 효율적일 수 있음(아래 참고).
     */
    long countByTargetTypeAndTargetId(LikeTargetType targetType, Long targetId);

    /**
     * (목록 최적화) 현재 사용자(memberId)가 특정 id 집합에 대해 "좋아요 누른 대상 id들"만 조회.
     * - IN 절로 한 번에 조회 → N+1 방지
     * - JPQL: 반환은 targetId만 뽑아서 List<Long>
     * - 사용처: 게시글/댓글 목록 API에서, 각 행의 liked 플래그 세팅
     */
    @Query("""
                select l.targetId
                from LikeEntity l
                where l.targetType = :type
                  and l.memberId   = :memberId
                  and l.targetId in :ids
            """)
    List<Long> findLikedIdsIn(@Param("type") LikeTargetType type,
                              @Param("memberId") String memberId,
                              @Param("ids") List<Long> ids);

    // 공용 좋아요 레포지토리에 배치 삭제 메서드
    long deleteByTargetTypeAndTargetId(LikeTargetType targetType, Long targetId);
}

/**
 * 좋아요(BOARD/COMMENT 공용) 읽기/쓰기용 JPA 레포지토리.
 * - 중복 방지는 DB 유니크 제약(@Table uniqueConstraints)으로 보장.
 * - 여기서는 "존재 여부 확인/단건 조회/카운트/목록 상태 조회" 위주 메서드 제공.
 */
