package com.anpetna.cart.dto.addCartItem;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddCartItemReq {

    @NotBlank
    private String itemId;  // 추가하려는 아이디

    @Min(1)
    private int quantity;   // 추가하려는 상품 수량
}