package com.anpetna.adminPage.repository;

import com.anpetna.adminPage.domain.AdminBlacklistEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface AdminBlacklistJpaRepository extends JpaRepository<AdminBlacklistEntity, Long> {

    /*
     * (로그인 차단 체크용) 활성 블랙 존재 여부
     */
    @Query("""
                select count(b) > 0
                  from AdminBlacklistEntity b
                 where b.memberId = :memberId
                   and (b.untilAt is null or b.untilAt > :now)
            """)
    boolean existsActiveByMemberId(@Param("memberId") String memberId,
                                   @Param("now") LocalDateTime now);

    /*
     * 현재 활성 블랙만 조회 (대소문자 무시, 부분검색)
     */
    @Query("""
                select b
                  from AdminBlacklistEntity b
                 where (:keyword is null
                        or lower(b.memberId) like lower(concat('%', :keyword, '%')))
                   and (b.untilAt is null or b.untilAt > :now)
                 order by b.id desc
            """)
    Page<AdminBlacklistEntity> findActiveBlacklist(@Param("keyword") String keyword,
                                                   @Param("now") LocalDateTime now,
                                                   Pageable pageable);

    /*
     * 전체 이력 조회 (대소문자 무시, 부분검색)
     */
    @Query("""
                select b
                  from AdminBlacklistEntity b
                 where (:keyword is null
                        or lower(b.memberId) like lower(concat('%', :keyword, '%')))
                 order by b.id desc
            """)
    Page<AdminBlacklistEntity> findAllHistory(@Param("keyword") String keyword,
                                              Pageable pageable);

    /*
     * 특정 회원 이력만 (정렬 포함 JPA 메서드)
     */
    Page<AdminBlacklistEntity> findByMemberIdOrderByIdDesc(String memberId, Pageable pageable);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
UPDATE AdminBlacklistEntity b
   SET b.untilAt = :now
 WHERE b.memberId = :memberId
   AND (b.untilAt IS NULL OR b.untilAt > :now)
""")
    int deactivateActiveForMember(@Param("memberId") String memberId, @Param("now") LocalDateTime now);



}
