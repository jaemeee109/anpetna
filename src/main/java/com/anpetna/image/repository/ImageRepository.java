package com.anpetna.image.repository;

import com.anpetna.image.domain.ImageEntity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ImageRepository extends JpaRepository<ImageEntity, Long> {

    @Query("""
    select i.fileName from ImageEntity i
    where i.item.itemId = :itemId
    """)
    List<String> getFileName(@Param("itemId")Long itemId);
}

