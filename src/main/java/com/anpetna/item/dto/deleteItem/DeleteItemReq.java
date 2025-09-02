package com.anpetna.item.dto.deleteItem;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Builder
@ToString
public class DeleteItemReq {

    private Long itemId;
    private String itemName;

}
