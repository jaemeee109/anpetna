package com.anpetna.cart.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartSummaryDTO {

    private int count;           // 아이템 종류 수

    private int totalQuantity;   // 총 수량

    private long totalPrice;     // Σ(price * quantity)

    private Long totalDiscount;  // 총 할인액(옵션)

    private long payablePrice;   // 결제 예정 금액(= totalPrice - totalDiscount)

    private String currency;     // "KRW" 등(옵션)
}
