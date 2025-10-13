package com.anpetna.venue.repository.hospital;

import com.anpetna.venue.domain.hospital.VenueDoctorEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

// 매장(병원/ 호텔) 의사 정보를 DB에서 조회, 저장
public interface VenueDoctorRepository extends JpaRepository<VenueDoctorEntity, Long> {

    // 특정 매장의 활성화된 의사 목록을 조회 (active = ture)
    List<VenueDoctorEntity> findByVenue_VenueIdAndActiveTrue(Long venueId);


}
