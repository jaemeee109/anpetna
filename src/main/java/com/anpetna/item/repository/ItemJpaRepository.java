package com.anpetna.item.repository;

import com.anpetna.item.domain.ItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ItemJpaRepository extends JpaRepository<ItemEntity, Long>, ItemRepositoryCustom {

}
