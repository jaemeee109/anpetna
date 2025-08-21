package com.anpetna.order.dto.registerOrder;

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
public class RegisterOrdersRes {

    private Long ordersId;
    private String memberId;
    private String cardId;

    private int totalPrice;     // 총액
    private int itemQuantity;   // 총 수량

    @Builder.Default
    private List<Item> items = new ArrayList<>();

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Item {
        private Long orderItemId; // 생성된 주문 품목 ID
        private Long itemId;
        private int price;
        private int quantity;
    }

}
