package com.anpetna.item.repository;

import com.anpetna.item.domain.ItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ItemRepository extends JpaRepository<ItemEntity, Long>, ItemRepositoryCustom {


    //void deleteImages(List<UUID> deleteImages);
}
