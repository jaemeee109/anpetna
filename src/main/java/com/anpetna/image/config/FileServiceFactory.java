package com.anpetna.image.config;

import com.anpetna.image.service.FileService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Component
public class FileServiceFactory {

    private final FileService localStorage;
    private final FileService minioService;

    public FileServiceFactory(@Qualifier("localStorage") FileService localStorage,
                              @Qualifier("minioService") FileService minioService) {
        this.localStorage = localStorage;
        this.minioService = minioService;
    }

    @Bean
    @Primary
    public FileService getFileService(@Value("${storage.location}")String storageLocation){
        return switch (storageLocation) {
            case "local" -> localStorage;
            case "minio" -> minioService;
            default -> null;
            //예외처리
        };
    }
}
