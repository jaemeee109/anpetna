package com.anpetna.coreDto;

import com.anpetna.coreDomain.ImageEntity;
import lombok.*;

@Getter
@Builder
@Data
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
