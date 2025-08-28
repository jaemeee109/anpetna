package com.anpetna.item.repository;

import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.dto.searchAllItem.SearchAllItemsReq;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ItemRepositoryCustom {

    Page<ItemEntity> orderBy(Pageable pageable, SearchAllItemsReq req);

}
