package com.anpetna.banner.dto;

import com.anpetna.banner.domain.BannerEntity;
import lombok.*;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class HomeBannerDTO {

    private Long id;
    private String imageUrl;
    private String linkUrl;
    private Integer sortOrder;

    public static HomeBannerDTO from(BannerEntity e) {
        HomeBannerDTO homeBannerDTO = new HomeBannerDTO();
        homeBannerDTO.id = e.getId();
        homeBannerDTO.imageUrl = e.getImageUrl();
        homeBannerDTO.linkUrl = e.getLinkUrl();
        homeBannerDTO.sortOrder = e.getSortOrder();
        return homeBannerDTO;
    }
}

/*
 * 메인 홈 노출 전용: 화면에 필요한 최소 필드만
 */