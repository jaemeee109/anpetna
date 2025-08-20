package com.anpetna.cart.dto.deleteCartItem;

import com.anpetna.cart.dto.CartSummaryDTO;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeleteCartItemRes {

    private String itemId;

    private boolean removed;

    private CartSummaryDTO summary; // 삭제 후 합계
}
