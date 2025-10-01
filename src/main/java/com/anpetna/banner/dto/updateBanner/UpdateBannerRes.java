package com.anpetna.banner.dto.updateBanner;

import com.anpetna.banner.domain.BannerEntity;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UpdateBannerRes {

    private Long id;
    private String imageUrl;
    private String linkUrl;
    private boolean active;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private Integer sortOrder;

    public static UpdateBannerRes from(BannerEntity bannerEntity) {
        UpdateBannerRes updateBannerRes = new UpdateBannerRes();
        updateBannerRes.id = bannerEntity.getId();
        updateBannerRes.imageUrl = bannerEntity.getImageUrl();
        updateBannerRes.linkUrl = bannerEntity.getLinkUrl();
        updateBannerRes.active = bannerEntity.isActive();
        updateBannerRes.startAt = bannerEntity.getStartAt();
        updateBannerRes.endAt = bannerEntity.getEndAt();
        updateBannerRes.sortOrder = bannerEntity.getSortOrder();
        return updateBannerRes;
    }
}
