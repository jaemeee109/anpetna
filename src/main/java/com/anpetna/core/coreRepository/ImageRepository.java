package com.anpetna.core.coreRepository;

import com.anpetna.core.coreDomain.ImageEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImageRepository extends JpaRepository<ImageEntity, Long> {
}

