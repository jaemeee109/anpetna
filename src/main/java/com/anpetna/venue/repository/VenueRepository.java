package com.anpetna.venue.repository;

import com.anpetna.venue.domain.VenueEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

// 매장(병원/ 호텔) 정보를 DB에서 CRUD
public interface VenueRepository extends JpaRepository<VenueEntity, Long> {


    // 활성화 처리 되어있는 매장만 조회 (active=true)
    List<VenueEntity> findByActiveTrue();


}
