package com.anpetna.item.dto.searchAllItem;

import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.constant.ItemPrice;
import com.anpetna.item.constant.ItemSellStatus;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.query.SortDirection;

@Setter
@Getter
public class SearchAllItemsReq {

    private ItemSellStatus sortBySale; // 상품 판매상태

    private ItemCategory sortByCategory; // 상품 카테고리

    private SortDirection orderByPriceDir; // 가격순 ASC, DESC (Enum)

}
