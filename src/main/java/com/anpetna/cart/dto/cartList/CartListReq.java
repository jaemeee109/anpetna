package com.anpetna.cart.dto.cartList;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartListReq {

    @Builder.Default
    private String availability = "ALL";    // 장바구 상품 노출 필터 : All || ONLY_SELLABLE || ONLY_OUT_OF_STOCK || defaultValue = "ALL"

    @Builder.Default
    private boolean includePricing = true;  // 가격/할인 정보 포함 여부, defaultValue = "true"

    @Builder.Default
    private boolean includeImages = true;   // 이미지(썸네일) 정보 포함 여부. defaultValue = "true"

    @Builder.Default
    private Integer page = 0;   // 페이지 번호

    @Builder.Default
    private Integer size = 20;  // 페이지 크기.

    @Builder.Default
    private String sort = "desc"; // 정렬
}