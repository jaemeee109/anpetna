package com.anpetna.cart.dto.addCartItem;

import com.anpetna.cart.dto.CartSummaryDTO;
import com.anpetna.item.dto.ItemDTO;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddCartItemRes {

    private ItemDTO item;               // 현재 항목 상태

    private CartSummaryDTO summary;     // 장바구니 합계(옵션)
}
