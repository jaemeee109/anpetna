package com.anpetna.image.service;

import com.anpetna.image.dto.ImageDTO;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.IOException;
import java.nio.file.*;

import static java.nio.file.StandardCopyOption.ATOMIC_MOVE;
import static java.nio.file.StandardCopyOption.REPLACE_EXISTING;

@Service
@Log4j2
public class LocalStorage implements FileService {

    private final String uploadDir;
    private final String urlBase;
    private final Path base;

    public LocalStorage(@Value("${app.upload.dir}") String uploadDir,
                        @Value("${app.upload.url-base}") String urlBase) {
        this.uploadDir = uploadDir;
        this.urlBase = urlBase;
        this.base = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    //@PostConstruct 를 붙여둔 init() 메서드는 Spring 이 Bean 을 생성하고, 모든 의존성 주입까지 끝낸 직후 자동으로 한 번 호출
    @PostConstruct
    void init() throws IOException {
        if (uploadDir == null || uploadDir.isBlank()) {
            throw new IllegalStateException("app.upload.dir 미설정");
        }
        if (urlBase == null || urlBase.isBlank()) {
            throw new IllegalStateException("app.upload.url-base 미설정");
        }
        log.info("[upload] dir={}, urlBase={}", uploadDir, urlBase);
        if (Files.notExists(base)) { // 존재하지 않으면 true
            Files.createDirectories(base); // 재귀적으로 생성
            System.out.println("디렉터리를 새로 생성했습니다: " + base);
        }
        // 예외 처리는 후처리로
    }

    @Override
    public ImageDTO uploadFile(MultipartFile file, Integer sortOrder) {
        ImageDTO imageDTO = new ImageDTO(file, sortOrder);
        try {
            Path temp = base.resolve(imageDTO.getFileName() + ".part").normalize();
            Path target = base.resolve(imageDTO.getFileName()).normalize();
            if (!temp.startsWith(base) || !target.startsWith(base)) throw new SecurityException();
            try (var in = file.getInputStream()) {
                Files.copy(in, temp, REPLACE_EXISTING);
            }
                Files.move(temp, target, REPLACE_EXISTING);
            imageDTO.setUrl(urlBase + "/" + imageDTO.getFileName());
        } catch (IOException e) {
            throw new RuntimeException("로컬 업로드 실패: " + e);   // 예외 처리는 후처리로
        }
        log.info("[upload] file={}, url={}", imageDTO.getFileName(), imageDTO.getUrl());
        return imageDTO;
    }


    @Override
    public byte[] downloadFile(String key) {
        try {
            Path filePath = Paths.get(uploadDir).resolve(key);
            return Files.readAllBytes(filePath);
        } catch (IOException e) {
            throw new RuntimeException("파일 읽기 실패: " + key, e);
        }
    }

    @Override
    public void deleteFile(String key) {
        try {
            Path filePath = Paths.get(uploadDir).resolve(key);
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            throw new RuntimeException("파일 삭제 실패: " + key, e);
        }
    }
}
