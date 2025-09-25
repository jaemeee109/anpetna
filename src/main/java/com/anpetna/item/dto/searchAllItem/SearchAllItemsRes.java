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

    private ItemSellStatus itemSellStatus; // 상품 판매상태

    private String thumbnailUrl;

    private Integer itemStock;       // 현재 재고
    private ItemCategory itemCategory; // 카테고리

}