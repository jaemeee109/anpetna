package com.anpetna.item.dto.searchAllReview;

import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.constant.ItemSaleStatus;
import com.anpetna.item.constant.ItemSellStatus;
import lombok.Getter;
import org.hibernate.query.SortDirection;

@Getter
public class SearchAllReviewsReq {

    private ItemSellStatus itemSellStatus; // 상품 판매상태

    private ItemSaleStatus itemSaleStatus; // 상품 세일상태

    private ItemCategory itemCategory; // 상품 카테고리

    private SortDirection direction; // ASC, DESC (Enum)

}
