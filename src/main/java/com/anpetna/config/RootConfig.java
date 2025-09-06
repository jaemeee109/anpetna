package com.anpetna.config;

import org.modelmapper.ModelMapper;
import org.modelmapper.convention.MatchingStrategies;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.ProfileCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
public class RootConfig {

    @Bean
    public ModelMapper getMapper() {

        var modelMapper = new ModelMapper();

        modelMapper.getConfiguration()
                .setFieldMatchingEnabled(true)
                .setFieldAccessLevel(org.modelmapper.config.Configuration.AccessLevel.PRIVATE)
                .setMatchingStrategy(MatchingStrategies.STRICT)
                .setSkipNullEnabled(true);

        return modelMapper;
    }

    @Value("${app.upload.type}")
    private String type;

 /*   @Bean
    public FileService getStorage(LocalStorage local, S3ImageStorage s3) {
        return switch (type) {
            case "s3" -> s3;
            default -> local;
        };
    }*/

    @Bean
    public S3Client s3Client(@Value("${app.upload.region}") String region) {
        return S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(ProfileCredentialsProvider.create())
                .build();
    }

}