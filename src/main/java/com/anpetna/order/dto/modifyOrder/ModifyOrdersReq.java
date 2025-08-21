package com.anpetna.order.dto.modifyOrder;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * 주문 수정: 간단히 "품목 전체 교체" + 카드ID 변경 정도로 설계
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModifyOrdersReq {

    @NotNull
    private Long ordersId;

    /** 카드 변경이 필요 없으면 null 가능 */
    private String cardId;

    @Builder.Default
    @NotNull // 최소 1개 품목
    @Valid    // 하위 Item 검증 수행
    private List<Item> items = new ArrayList<>();

    @Getter @Builder
    @NoArgsConstructor @AllArgsConstructor
    public static class Item {
        @NotNull
        private Long itemId;

        @Positive
        private int price;

        @Positive
        private int quantity;
    }

}
