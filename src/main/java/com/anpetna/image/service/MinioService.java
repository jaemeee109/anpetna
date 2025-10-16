package com.anpetna.image.service;

import com.anpetna.image.config.MinioConfig;
import com.anpetna.image.dto.ImageDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import java.io.InputStream;


@Service("minioService")
@RequiredArgsConstructor
@Log4j2
public class MinioService implements FileService{

    private final S3Client s3Client;
    private final String minioBucketName;

    @Value("${app.upload.url-base}")
    String urlBase;


    @Override
    public ImageDTO uploadFile(MultipartFile file, Integer sortOrder) {
        ImageDTO imageDTO = new ImageDTO(file, sortOrder);

        try {
            String fileName = imageDTO.getFileName();

            // MultipartFile → InputStream
            try (InputStream inputStream = file.getInputStream()) {
                PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                        .bucket(minioBucketName)
                        .key(fileName)
                        .contentType(file.getContentType())
                        .build();

                s3Client.putObject(putObjectRequest,
                        RequestBody.fromInputStream(inputStream, file.getSize()));
            }

            imageDTO.setUrl(urlBase + "/" + imageDTO.getFileName());
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
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(minioBucketName)
                .key(key)
                .build());
    }



}
