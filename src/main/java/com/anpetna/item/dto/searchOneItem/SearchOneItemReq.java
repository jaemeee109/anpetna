package com.anpetna.item.dto.searchOneItem;

import lombok.Builder;
import lombok.Getter;
import lombok.ToString;

@Getter
@Builder
@ToString
public class SearchOneItemReq {

    private Long itemId; // 상품코드

}
