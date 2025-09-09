package com.anpetna.cart.dto.updateCartItemQuantity;

import jakarta.validation.constraints.Min;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCartItemQuantityReq {

    @Min(1)
    private int quantity;
}
