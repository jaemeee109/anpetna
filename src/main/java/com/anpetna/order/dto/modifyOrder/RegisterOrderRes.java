package com.anpetna.order.dto.modifyOrder;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterOrderRes {

    private Long itemId;    // 상품Id

    private int price;  // 가격

    private int quantity;   // 수량

}
