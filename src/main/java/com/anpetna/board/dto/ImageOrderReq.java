package com.anpetna.board.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImageOrderReq {
    private UUID uuid;        // 이미지 식별자 (ImageEntity.getUuid()와 타입 일치)
    private Integer sortOrder; // 변경할 정렬 순서
}
