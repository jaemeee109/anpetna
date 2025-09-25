package com.anpetna.venue.repository;

import com.anpetna.venue.domain.VenueEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Venue 테이블 접근용 JPA 레포지토리 */
public interface VenueRepository extends JpaRepository<VenueEntity, Long> {
    /** 노출 active=true 인 지점들만 조회 (목록용) */
    List<VenueEntity> findByActiveTrue();


}
