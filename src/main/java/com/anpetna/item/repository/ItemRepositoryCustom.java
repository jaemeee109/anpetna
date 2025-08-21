package com.anpetna.item.repository;

import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.dto.searchAllItem.SearchAllItemsReq;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ItemRepositoryCustom {

    List<ItemEntity> sortByCategory(SearchAllItemsReq req);

    List<ItemEntity> orderByPrice(SearchAllItemsReq req);

    List<ItemEntity> orderBySales(SearchAllItemsReq req);


}
