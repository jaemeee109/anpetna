package com.anpetna.order.dto.deleteOrder;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterOrderRes {

    private Long itemId;    // 상품 Id

    private int price;      // 상품 가격

    private int quantity;   // 상품 수량

}
