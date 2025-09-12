package com.anpetna.order.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderDTO {

    private Long orderId;   // 주문 코드

    private Long itemId;    // ItemEntity PK

    private String name;      // ★추가

    private int price;  // 단가

    private int quantity;   // 주문 수량

    private String thumbnailUrl;   // 라인 썸네일 URL

}
