package com.anpetna.item.dto.registerItem;

import com.anpetna.coreDomain.ImageEntity;
import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.constant.ItemSaleStatus;
import com.anpetna.item.constant.ItemSellStatus;
import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

public class RegisterItemReq {

    private Long itemId; // 상품코드

    private String itemName; // 상품명

    private int itemPrice; // 가격

    private int itemStock; // 재고수량

    private String itemDetail; // 상품 상세설명

    private ItemSellStatus itemSellStatus; // 상품 판매상태

    private ItemSaleStatus itemSaleStatus; // 상품 세일상태

    private ItemCategory itemCategory; // 상품 카테고리

    private List<ImageEntity> itemImages = new ArrayList<>();

    private List<ImageEntity> itemThumbs = new ArrayList<>();


}
