package com.anpetna.order.dto.registerOrder;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterOrderRes {

    private Long itemId;

    private int price;

    private int quantity;

}
