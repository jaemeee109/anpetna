package com.anpetna.venue.repository;

import com.anpetna.venue.domain.VenueDoctorEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VenueDoctorRepository extends JpaRepository<VenueDoctorEntity, Long> {
    List<VenueDoctorEntity> findByVenue_VenueIdAndActiveTrue(Long venueId);
}
