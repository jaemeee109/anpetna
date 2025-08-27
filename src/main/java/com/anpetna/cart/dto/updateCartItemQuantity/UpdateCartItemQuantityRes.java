package com.anpetna.cart.dto.updateCartItemQuantity;

import com.anpetna.cart.dto.CartSummaryDTO;
import com.anpetna.item.dto.ItemDTO;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCartItemQuantityRes {

    private ItemDTO item;

    private CartSummaryDTO summary; // 전체 합계(옵션)
}
