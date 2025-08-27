package com.anpetna.coreDto;

import com.anpetna.coreDomain.ImageEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImageDTO {

    private Long uuid;        // 이미지 고유 ID
    private String fileName;  // 파일 이름
    private String url;       // 이미지 URL
    private Integer sortOrder; // 정렬 순서

    // Entity -> DTO 변환 생성자
    public ImageDTO(ImageEntity entity) {
        this.uuid = entity.getUuid();
        this.fileName = entity.getFileName();
        this.url = entity.getUrl();
        this.sortOrder = entity.getSortOrder();
    }
}