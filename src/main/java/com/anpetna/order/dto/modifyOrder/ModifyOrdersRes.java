package com.anpetna.order.dto.modifyOrder;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModifyOrdersRes {

    private Long ordersId;
    private String memberId;
    private String cardId;

    private int totalPrice;    // 수정 후 총액
    private int itemQuantity;  // 수정 후 총 수량

    @Builder.Default
    private List<Item> items = new ArrayList<>();

    @Getter @Builder
    @NoArgsConstructor @AllArgsConstructor
    public static class Item {
        private Long orderItemId; // 수정 후 품목 ID
        private Long itemId;
        private int price;
        private int quantity;
    }

}
