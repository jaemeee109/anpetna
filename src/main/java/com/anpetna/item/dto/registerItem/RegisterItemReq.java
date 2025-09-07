package com.anpetna.item.dto.registerItem;

import com.anpetna.image.dto.ImageDTO;
import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.constant.ItemSellStatus;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Builder
@Getter
@ToString
public class RegisterItemReq {

    private String itemName; // 상품명

    private int itemPrice; // 가격

    private int itemStock; // 재고수량

    private String itemDetail; // 상품 상세설명

    private ItemSellStatus itemSellStatus; // 상품 판매상태

    private ItemCategory itemCategory; // 상품 카테고리

    private final List<ImageDTO> images = new ArrayList<>();

    public void addImage(ImageDTO imageDTO) {
        this.images.add(imageDTO);
    }

}
