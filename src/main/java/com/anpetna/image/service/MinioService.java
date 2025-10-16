package com.anpetna.image.service;

import com.anpetna.image.config.MinioConfig;
import com.anpetna.image.dto.ImageDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import java.io.InputStream;


@Service("minioService")
@RequiredArgsConstructor
@Log4j2
public class MinioService implements FileService{

    private final MinioConfig minioConfig;

    @Override
    public ImageDTO uploadFile(MultipartFile file, Integer sortOrder) {
        ImageDTO imageDTO = new ImageDTO(file, sortOrder);

        try {
            String fileName = imageDTO.getFileName();
            String bucket = minioConfig.getBucket();

            // MultipartFile → InputStream
            try (InputStream inputStream = file.getInputStream()) {
                PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(fileName)
                        .contentType(file.getContentType())
                        .build();

                minioConfig.s3Client().putObject(putObjectRequest,
                        RequestBody.fromInputStream(inputStream, file.getSize()));
            }

            // 접근 가능한 URL 구성
            imageDTO.setUrl(minioConfig.getMinioUrl() + "/" + bucket + "/" + fileName);
            log.info("[upload] file={}, url={}", fileName, imageDTO.getUrl());
            return imageDTO;

        } catch (Exception e) {
            throw new RuntimeException("MinIO 업로드 실패: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] downloadFile(String key) {
        return new byte[0];
    }

    @Override
    public void deleteFile(String key) {
        minioConfig.s3Client().deleteObject(DeleteObjectRequest.builder()
                .bucket(minioConfig.getBucket())
                .key(key)
                .build());
    }



}
