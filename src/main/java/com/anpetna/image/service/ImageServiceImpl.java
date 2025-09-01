package com.anpetna.image.service;

import com.anpetna.image.dto.ImageDTO;
import org.springframework.beans.factory.annotation.Value; //import 주의
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Service
public class ImageServiceImpl implements ImageService {

    private final String s3url;
    private final String uploadDir;

    public ImageServiceImpl(@Value("${app.upload.dir}")String uploadDir, @Value("${app.upload.url-base}")String s3url) {
        this.s3url = s3url;
        this.uploadDir = uploadDir;
    }

    @Override
    public ImageDTO uploadImage(MultipartFile file) throws IOException {
        ImageDTO imageDTO = new ImageDTO(file).from(uploadDir, s3url);
        Path path = Paths.get(uploadDir, imageDTO.getFileName());
        Files.copy(file.getInputStream(), path, StandardCopyOption.REPLACE_EXISTING);
        return imageDTO;
    }
    // "resMessage": "Cannot invoke \"String.isEmpty()\" because \"segment\" is null"
}
