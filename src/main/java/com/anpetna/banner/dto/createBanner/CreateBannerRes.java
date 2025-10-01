package com.anpetna.banner.dto.createBanner;

import lombok.*;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CreateBannerRes {

    private Long id;
    private String imageUrl;
}
