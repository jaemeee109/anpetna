package com.anpetna.banner.dto.createBanner;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CreateBannerReq {

    @NotNull
    private Integer sortOrder;

    @NotNull
    private Boolean active;

    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private String linkUrl;
}

/*
 * 생성 요청: JSON 파트(@RequestPart("json"))
 * 이미지 파일은 Multipart 별도 @RequestPart("image")
 */
