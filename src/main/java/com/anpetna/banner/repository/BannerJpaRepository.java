package com.anpetna.banner.repository;

import com.anpetna.banner.domain.BannerEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;


import java.time.LocalDateTime;
import java.util.List;


public interface BannerJpaRepository extends JpaRepository<BannerEntity, Long> {

    // 활성화된 배너만 조회 (시작 /종료 시간 조건 포함)
    List<BannerEntity> findAllByActiveTrue();

    /**
     * 메인 홈에 노출 가능한 배너만 조회
     * active = true
     * (startAt is null or startAt <= :now)
     * (endAt is null or endAt >= :now)
     * 정렬: sortOrder ASC, id DESC
     */
    @Query("""
            select b 
            from BannerEntity b
            where b.active = true
              and (b.startAt is null or b.startAt <= :now)
              and (b.endAt   is null or b.endAt   >= :now)
            order by b.sortOrder asc, b.id desc
            """)
    List<BannerEntity> findDisplayable(LocalDateTime now, Pageable pageable);

}
