package com.anpetna.item.dto.modifyItem;

import com.anpetna.coreDomain.ImageEntity;
import com.anpetna.item.constant.ItemSaleStatus;
import com.anpetna.item.constant.ItemSellStatus;

import java.util.ArrayList;
import java.util.List;

public class ModifyItemReq {


    private int itemStock; // 재고수량

    private String itemDetail; // 상품 상세설명

    private ItemSellStatus itemSellStatus; // 상품 판매상태

    private ItemSaleStatus itemSaleStatus; // 상품 세일상태

    private List<ImageEntity> itemImages = new ArrayList<>();

    private List<ImageEntity> itemThumbs = new ArrayList<>();

}
