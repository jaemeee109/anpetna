package com.anpetna.banner.infra;

import com.anpetna.image.dto.ImageDTO;
import com.anpetna.image.service.FileService;
import com.anpetna.image.service.MinioService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.util.Set;

@Component // 스프링이 Bean 으로 등록해줌
@RequiredArgsConstructor
@Log4j2
public class BannerImageStorage {

    private final FileService fileService;   // 공용 이미지 서비스(로컬/S3 등 구현체)

    @Value("${app.upload.url-base}")
    private String uploadUrlBase; // ex) /files

    @PostConstruct
    void validateUploadProps() {
        if (uploadUrlBase == null || uploadUrlBase.isBlank()) {
            throw new IllegalStateException("app.upload.url-base 미설정");
        }
        log.info("[banner-image] urlBase={}", uploadUrlBase);
    }

    /*
     * 저장 가능한 파일 타입
     */
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"
    );

    /**
     * 새 배너 이미지 저장
     * - Update 에서 파일이 없으면 이 메서드 자체를 호출하지 마시오(null-safe 는 서비스에서 처리)
     * - FileService 가 URL 까지 세팅한 ImageDTO 를 반환하므로 해당 URL 을 저장
     */
    public String saveBannerImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("배너 이미지는 필수입니다."); // Create 에서만 사용 권장
        }
        if (file.getContentType() != null && !ALLOWED_CONTENT_TYPES.contains(file.getContentType())) {
            throw new IllegalArgumentException("허용되지 않는 이미지 형식입니다.");
        }
        // sortOrder 는 배너 단건 기준 의미 없으니 null 전달
        ImageDTO imageDTO = fileService.uploadFile(file, null);
        String url = imageDTO.getUrl();
        log.info("[banner-image] saved fileName={}, url={}", imageDTO.getFileName(), url);
        return url;
    }

    /**
     * 배너 이미지 교체 업로드
     * 1) 새 파일 업로드(실패 시 예외 → 전체 롤백)
     * 2) 트랜잭션 커밋 성공 시에만 oldUrl 삭제
     * 3) 롤백되면 방금 업로드한 새 파일 회수
     *
     * @param oldUrl 기존 파일 URL (null 가능)
     * @param file   새 이미지 파일 (필수)
     * @return 새 파일의 접근 URL
     */
    public String replaceBannerImage(String oldUrl, MultipartFile file) {
        // 업로드(검증 포함)
        final String newUrl = saveBannerImage(file);

        // 트랜잭션 안에서 호출되면 커밋/롤백 훅 등록
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    // 커밋 성공 → 구파일 삭제
                    if (oldUrl != null && !oldUrl.isBlank()) {
                        try {
                            deleteByUrl(oldUrl);
                        } catch (Exception e) {
                            log.warn("[banner-image] delete old afterCommit failed: {}", oldUrl, e);
                        }
                    }
                }

                @Override
                public void afterCompletion(int status) {
                    // 롤백 → 방금 업로드한 새 파일 회수
                    if (status != TransactionSynchronization.STATUS_COMMITTED) {
                        try {
                            deleteByUrl(newUrl);
                        } catch (Exception e) {
                            log.warn("[banner-image] cleanup new after rollback failed: {}", newUrl, e);
                        }
                    }
                }
            });
        } else {
            // 트랜잭션이 없으면 즉시 구파일 삭제(롤백 개념 없음)
            if (oldUrl != null && !oldUrl.isBlank()) {
                try {
                    deleteByUrl(oldUrl);
                } catch (Exception e) {
                    log.warn("[banner-image] delete old (no tx) failed: {}", oldUrl, e);
                }
            }
        }

        return newUrl;
    }

    /**
     * URL을 받아 실제 파일 삭제 위임
     * - 공용 FileService.deleteFile은 fileName 을 요구하는 경우가 많아서
     * urlBase를 기준으로 fileName을 파싱해 전달
     * - 삭제 실패는 로깅만 하고 넘어가 DB 삭제를 막지 않음
     */
    public void deleteByUrl(String url) {
        if (url == null || url.isBlank()) return;

        String path = url;
        try {
            path = java.net.URI.create(url).getPath();
        } catch (Exception ignore) {
        }

        String prefix = uploadUrlBase.endsWith("/") ? uploadUrlBase : uploadUrlBase + "/"; // "/files/"
        String fileName;
        if (path.startsWith(prefix)) {
            fileName = path.substring(prefix.length()); // "banner/bn_xxx.jpg" 등
        } else {
            // fallback: 마지막 세그먼트만이라도 제거 시도
            String p = path;
            int idx = p.lastIndexOf('/');
            fileName = (idx >= 0 && idx < p.length() - 1) ? p.substring(idx + 1) : p;
            log.warn("[banner-image] unexpected url prefix. fallback delete. url={}, parsedFile={}", url, fileName);
        }

        try {
            fileService.deleteFile(fileName);
            log.info("[banner-image] delete success fileName={}", fileName);
        } catch (Exception e) {
            log.error("[banner-image] delete failed fileName={}", fileName, e);
        }
    }
}

/*
 * 배너 이미지 저장소
 * 실제 파일 시스템에 저장
 * 접근 URL 을 생성하여 반환
 */

/*
입력 검증
파일 존재 확인 (isEmpty() → 예외)
Content-Type 화이트리스트 검사(이미지 MIME 만 허용)

파일명/위치 결정
파일 확장자: 원본 파일명에서 마지막 . 뒤를 추출 (없어도 동작, 가능하면 MIME 보조 매핑 추가 권장)
저장 파일명: bn_{UUID}.{ext} (충돌 방지)
저장 경로: {uploadDir}/banner/ 디렉토리 자동 생성 후 저장

접근 URL 생성
반환값: {uploadUrlBase}/banner/{filename}
예) /files/banner/bn_1234...jpg

왜 좋은가
업로드/삭제/URL 생성 로직을 image 모듈 한 곳에서 통합 관리(DRY).
로컬→S3 전환 시 FileService 구현만 바꾸면 배너 코드는 영향 없음.
지금까지 작성한 BannerServiceImpl 의 saveBannerImage(...), deleteByUrl(...) 호출부를 그대로 유지할 수 있음.
*/
