package com.anpetna.coreRepository;

import com.anpetna.coreDomain.ImageEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImageRepository extends JpaRepository<ImageEntity, Long> {
}

