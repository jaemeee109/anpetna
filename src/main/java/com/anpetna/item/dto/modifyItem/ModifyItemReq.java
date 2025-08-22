package com.anpetna.item.dto.modifyItem;

import com.anpetna.coreDomain.ImageEntity;
import com.anpetna.coreDto.ImageDTO;
import com.anpetna.item.constant.ItemSaleStatus;
import com.anpetna.item.constant.ItemSellStatus;
import com.anpetna.item.dto.BaseReq;
import lombok.Builder;
import lombok.Getter;

import java.util.ArrayList;
import java.util.List;
@Builder
@Getter
public class ModifyItemReq extends BaseReq {

    private Long itemId;

    private int itemStock; // 재고수량

    private String itemDetail; // 상품 상세설명

    private ItemSellStatus itemSellStatus; // 상품 판매상태

    private ItemSaleStatus itemSaleStatus; // 상품 세일상태



}
