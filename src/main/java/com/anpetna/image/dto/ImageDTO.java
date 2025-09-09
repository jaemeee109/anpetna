package com.anpetna.image.dto;

import com.anpetna.image.domain.ImageEntity;
import lombok.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;

@Getter
@Builder
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ImageDTO {

    private UUID uuid;        // 이미지 고유 ID

    private String ext;         // 확장자

    private String fileName;     // 저장 파일명 (UUID + 확장자)

    private String originalName; // 업로드 당시 원본 파일명

    private String contentType;  // MIME 타입 (image/png 등)

    private String url;          // 접근 가능한 URL  <img src="{thumbnailUrl}">

    private Integer sortOrder;   // 정렬 순서 (옵션)

    public ImageDTO(MultipartFile file, Integer sortOrder) {
        // 새 파일명 생성
        this.uuid = UUID.randomUUID();
        this.originalName = file.getOriginalFilename();
        this.ext = file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf(".")); //확장자
        this.fileName = uuid+ext;
        this.contentType = "image/" + ext.substring(ext.lastIndexOf(".") + 1);
        this.sortOrder = sortOrder;
    }

    // Entity -> DTO 변환 생성자
    public ImageDTO(ImageEntity entity) {
        this.uuid = entity.getUuid();
        this.fileName = entity.getFileName();
        this.url = entity.getUrl();
        this.sortOrder = entity.getSortOrder();
    }

    //| 확장자        | MIME 타입     |
    //| ------------ | ------------- |
    //| .jpg / .jpeg | image/jpeg    |
    //| .png         | image/png     |
    //| .gif         | image/gif     |
    //| .bmp         | image/bmp     |
    //| .webp        | image/webp    |
    //| .tif / .tiff | image/tiff    |
    //| .svg         | image/svg+xml |
}