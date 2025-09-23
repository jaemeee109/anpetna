package com.anpetna.banner.dto.readBanner;

import com.anpetna.banner.domain.BannerEntity;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReadBannerRes {
    private Long id;
    private String imageUrl;
    private String linkUrl;
    private boolean active;
    private Integer sortOrder;
    private LocalDateTime startAt;
    private LocalDateTime endAt;

    // Entity → DTO 변환
    public static ReadBannerRes from(BannerEntity bannerEntity) {
        return ReadBannerRes.builder()
                .id(bannerEntity.getId())
                .imageUrl(bannerEntity.getImageUrl())
                .linkUrl(bannerEntity.getLinkUrl())
                .active(bannerEntity.isActive())
                .sortOrder(bannerEntity.getSortOrder())
                .startAt(bannerEntity.getStartAt())
                .endAt(bannerEntity.getEndAt())
                .build();
    }
}
