package com.anpetna.image.service;

import com.anpetna.image.dto.ImageDTO;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;

import static java.nio.file.StandardCopyOption.ATOMIC_MOVE;
import static java.nio.file.StandardCopyOption.REPLACE_EXISTING;

@Service("localStorage")
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
    @Async
    public void deleteFile(String fileName) {
        try {
            Path filePath = Paths.get(uploadDir).resolve(fileName).normalize();
            if (!filePath.startsWith(uploadDir)) return; // 경로 안전 체크

            Files.deleteIfExists(filePath);
            log.info("파일 삭제 완료: {}", fileName);
        } catch (IOException e) {
            log.error("파일 삭제 실패: {}", fileName, e);
        }
    }
}

//if + else if
// 첫 조건이 참이면 이후 조건은 검사 안 함
// 조건이 적고 빠름, 불필요한 체크 방지
// 조건 순서가 중요, 잘못 두면 안전 체크 누락 가능
//if 두 개 + else
// 모든 if 문을 순차적으로 평가
// 순서에 관계없이 안전하게 체크 가능
// 첫 조건이 참이어도 두 번째 조건 검사 → 약간의 오버헤드
