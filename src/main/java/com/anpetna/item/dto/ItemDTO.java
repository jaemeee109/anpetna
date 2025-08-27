package com.anpetna.item.dto;

import com.anpetna.coreDto.ImageListDTO;
import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.constant.ItemSaleStatus;
import com.anpetna.item.constant.ItemSellStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Getter
@ToString
@NoArgsConstructor
public class ItemDTO extends ImageListDTO {

    private Long itemId; // 상품코드

    private String itemName; // 상품명

    private int itemPrice; // 가격

    private int itemStock; // 재고수량

    private String itemDetail; // 상품 상세설명

    private ItemSellStatus itemSellStatus; // 상품 판매상태

    private ItemSaleStatus itemSaleStatus; // 상품 세일상태

    private ItemCategory itemCategory; // 상품 카테고리

}