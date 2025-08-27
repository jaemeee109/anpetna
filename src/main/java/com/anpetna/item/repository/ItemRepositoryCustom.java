package com.anpetna.item.repository;

import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.dto.searchAllItem.SearchAllItemsReq;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ItemRepositoryCustom {

    List<ItemEntity> sortByCategory(SearchAllItemsReq req);

    List<ItemEntity> sortBySales(SearchAllItemsReq req);

    List<ItemEntity> orderByPriceDir(SearchAllItemsReq req);


}
