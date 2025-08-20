package com.anpetna.cart.dto.cartList;

import com.anpetna.cart.dto.CartSummaryDTO;
import com.anpetna.item.dto.ItemDTO;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartListRes {

    private List<ItemDTO> items;

    private CartSummaryDTO summary;

    private PageDTO page; // 페이징 미사용이면 null 리턴하거나 필드 제거

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PageDTO {
        private Integer page;
        private Integer size;
        private Long totalElements;
        private Integer totalPages;
        private String sort;
    }
}
