package com.anpetna.item.dto.modifyItem;

import com.anpetna.coreDto.ImageListDTO;
import com.anpetna.item.constant.ItemSellStatus;
import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
public class ModifyItemReq extends ImageListDTO {

    private Long itemId;

    private int itemStock; // 재고수량

    private String itemDetail; // 상품 상세설명

    private ItemSellStatus itemSellStatus; // 상품 판매상태

}
