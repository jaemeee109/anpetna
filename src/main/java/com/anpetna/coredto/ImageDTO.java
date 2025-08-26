package com.anpetna.coreDto;

import com.anpetna.coreDomain.ImageEntity;
import jakarta.persistence.Column;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageDTO {
    private Long uuid;
    private String fileName;
    private String url;
    private Integer sortOrder;

    public ImageDTO(ImageEntity imageEntity) {
        this.uuid = imageEntity.getUuid();
        this.fileName = imageEntity.getFileName();
        this.url = imageEntity.getUrl();
        this.sortOrder = imageEntity.getSortOrder();
    }
}

