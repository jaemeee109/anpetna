package com.anpetna.item.dto.popularItem;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class PopularItemReq {

    // 판매중(SELL)만 노출할지 여부 (기본 true)
    @Builder.Default
    private Boolean sellOnly = Boolean.TRUE;

    // null-safe 접근자 (NPE 방지)
    public boolean isSellOnly() {
        return Boolean.TRUE.equals(sellOnly);
    }

}

/**
 * 메인 홈 인기상품 조회 요청 DTO
 * 항상 Top-5 기준
 * 옵션: 판매중 상품만 노출 여부
 */
