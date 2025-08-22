package com.anpetna.item.repository;

import com.anpetna.item.domain.ReviewEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewJpaRepository extends JpaRepository<ReviewEntity, Long>, ReviewRepositoryCustom {


}
