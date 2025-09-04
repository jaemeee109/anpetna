package com.anpetna.item.dto.searchAllItem;

import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.constant.ItemSellStatus;
import lombok.*;
import org.springframework.data.domain.Sort;

import java.util.ArrayList;
import java.util.List;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SearchAllItemsRes {

    private Long itemId; // 상품코드

    private String itemName; // 상품명

    private Integer itemPrice; // 가격

    private Integer itemStock; // 재고수량

    private String itemDetail; // 상품 상세설명

    private ItemSellStatus itemSellStatus; // 상품 판매상태

    private ItemCategory itemCategory; // 상품 카테고리

    private String thumbnailUrl;

}