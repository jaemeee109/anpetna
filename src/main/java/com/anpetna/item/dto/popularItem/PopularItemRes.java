package com.anpetna.item.dto.popularItem;

import com.anpetna.item.domain.ItemEntity;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class PopularItemRes {

    private Long itemId;      // 상품코드
    private String itemName;  // 상품명
    private int itemPrice;    // 가격
    private String thumbnailUrl;  // 썸네일 이미지 URL

    //ItemEntity -> PopularItemRes 변환
    public static PopularItemRes from(ItemEntity itemEntity) {
        String image = null;
        if (itemEntity.getImages() != null && !itemEntity.getImages().isEmpty()) {
            image = itemEntity.getImages().get(0).getUrl();
        }
        return PopularItemRes.builder()
                .itemId(itemEntity.getItemId())
                .itemName(itemEntity.getItemName())
                .itemPrice(itemEntity.getItemPrice())
                .thumbnailUrl(image)
                .build();
    }
}
/**
 * 메인 홈 인기상품 응답 DTO (Top-5)
 * 가장 기본적인 정보만 포함
 */
