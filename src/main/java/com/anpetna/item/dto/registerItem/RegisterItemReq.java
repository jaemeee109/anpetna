package com.anpetna.item.dto.registerItem;

import com.anpetna.coreDto.ImageListDTO;
import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.constant.ItemSellStatus;
import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
public class RegisterItemReq extends ImageListDTO {

    //  8개

    private String itemName; // 상품명

    private int itemPrice; // 가격

    private int itemStock; // 재고수량

    private String itemDetail; // 상품 상세설명

    private Integer itemSellStatus; // 상품 판매상태

    private ItemCategory itemCategory; // 상품 카테고리

    //썸네일 어케하지

}
