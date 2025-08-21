package com.anpetna.item.dto.deleteItem;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class DeleteItemReq {

    private Long itemId;
    private String itemName;
}
