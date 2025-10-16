package com.anpetna.image.controller;

import com.anpetna.image.config.MinioConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
public class FileController {

    private final MinioConfig minioConfig;

    @GetMapping("/{imageUrl}")
    public ResponseEntity<Void> redirectToMinio(@PathVariable String imageUrl) {
        String minioBaseUrl = minioConfig.getMinioUrl() +"/"+ minioConfig.getBucket();
        String minioUrl = minioBaseUrl + "/" + imageUrl;
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(minioUrl))
                .build();
    }

}
