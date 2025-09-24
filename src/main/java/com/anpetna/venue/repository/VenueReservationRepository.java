package com.anpetna.venue.repository;

import com.anpetna.venue.domain.VenueReservationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

/** 예약 테이블 접근용 JPA 레포지토리 */
public interface VenueReservationRepository
        extends JpaRepository<VenueReservationEntity, Long> {
}
