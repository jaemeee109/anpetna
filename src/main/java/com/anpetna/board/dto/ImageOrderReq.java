package com.anpetna.board.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImageOrderReq {
    private Long uuid;        // 이미지 식별자 (ImageEntity.getUuid()와 타입 일치)
    private Integer sortOrder; // 변경할 정렬 순서
}
