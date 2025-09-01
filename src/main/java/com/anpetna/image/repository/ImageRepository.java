package com.anpetna.image.repository;

import com.anpetna.image.domain.ImageEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImageRepository extends JpaRepository<ImageEntity, Long> {
}

