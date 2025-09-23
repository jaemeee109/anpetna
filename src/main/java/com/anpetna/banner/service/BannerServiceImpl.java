package com.anpetna.banner.service;

import com.anpetna.banner.domain.BannerEntity;
import com.anpetna.banner.dto.HomeBannerDTO;
import com.anpetna.banner.dto.createBanner.CreateBannerReq;
import com.anpetna.banner.dto.createBanner.CreateBannerRes;
import com.anpetna.banner.dto.readBanner.ReadBannerRes;
import com.anpetna.banner.dto.updateBanner.UpdateBannerReq;
import com.anpetna.banner.dto.updateBanner.UpdateBannerRes;
import com.anpetna.banner.infra.BannerImageStorage;
import com.anpetna.banner.repository.BannerJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
@Log4j2
public class BannerServiceImpl implements BannerService {

    /*의존성 주입*/
    private final BannerJpaRepository bannerJpaRepository;
    private final BannerImageStorage bannerImageStorage;

    /* 관리자 여부만 true/false 로 확인 */
    private boolean isAdmin() {
        // SecurityContext 에 인증이 있고, 권한 중 "ROLE_ADMIN"이 있는지 검사
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return false;
        for (GrantedAuthority ga : auth.getAuthorities()) {
            if ("ROLE_ADMIN".equals(ga.getAuthority())) {
                return true;
            }
        }
        return false;
    }

    /*배너 생성=============================================================================================
     * 1) 멀티파트 이미지 검증/저장({uploadDir}/banner/{uuid.ext})
     * 2) 공개 URL 생성({uploadUrlBase}/banner/{uuid.ext})
     * 3) 요청 DTO -> 엔티티 매핑 후 저장
     * 4) 저장 결과를 CreateBannerRes 로 반환
     */
    @Override
    public CreateBannerRes createBanner(CreateBannerReq createBannerReq, MultipartFile multipartFile) {
        // 0) 관리자 권한 검증
        if (!isAdmin()) {
            throw new AccessDeniedException("관리자 권한이 필요합니다.");
        }

        // (1) 파일 저장 → 접근 URL 리턴
        String imageUrl = bannerImageStorage.saveBannerImage(multipartFile);

        // (2) 요청 → 엔티티 매핑
        BannerEntity bannerEntity = BannerEntity.builder()
                .sortOrder(createBannerReq.getSortOrder() != null ? createBannerReq.getSortOrder() : 0)
                .active(Boolean.TRUE.equals(createBannerReq.getActive()))
                .startAt(createBannerReq.getStartAt())
                .endAt(createBannerReq.getEndAt())
                .linkUrl(createBannerReq.getLinkUrl())
                .imageUrl(imageUrl) // 저장된 이미지 경로 세팅
                .build();

        // (3) DB 저장
        BannerEntity saved = bannerJpaRepository.save(bannerEntity);
        log.info("=========================================================================");
        log.info("[banner:create] id={}, imageUrl={}, active={}, sortOrder={}",
                saved.getId(), saved.getImageUrl(), saved.isActive(), saved.getSortOrder());

        // (4) 응답 DTO 로 변환
        return CreateBannerRes.builder()
                .id(saved.getId())
                .imageUrl(saved.getImageUrl())
                .build();
    }

    /*배너 전체 조회=========================================================================================
     * 관리자용 배너 전체 조회 (페이징)
     */
    @Override
    @Transactional(readOnly = true)
    public Page<ReadBannerRes> readBanner(Pageable pageable) {
        // 0) 관리자 권한 검증
        if (!isAdmin()) {
            throw new AccessDeniedException("관리자 권한이 필요합니다.");
        }

        Page<BannerEntity> bannerEntityPage = bannerJpaRepository.findAll(pageable);
        return bannerEntityPage.map(ReadBannerRes::from);
    }

    /*배너 수정 =========================================================================================
     * 관리자용 배너 수정 메서드 (페이징)
     */
    @Override
    public UpdateBannerRes updateBanner(Long bannerId, UpdateBannerReq updateBannerReq, MultipartFile multipartFile) {
        // 0) 관리자 권한 검증
        if (!isAdmin()) {
            throw new AccessDeniedException("관리자 권한이 필요합니다.");
        }

        // 수정하고자 하는 배너 id 검색
        BannerEntity bannerEntity = bannerJpaRepository.findById(bannerId).orElseThrow(()
                -> new IllegalArgumentException("배너가 존재하지 않습니다. id=" + bannerId));

        // 부분 업데이트 null, 작성안하면 수정안함
        if (updateBannerReq.getLinkUrl() != null) bannerEntity.setLinkUrl(updateBannerReq.getLinkUrl());
        if (updateBannerReq.getActive() != null) bannerEntity.setActive(updateBannerReq.getActive());
        if (updateBannerReq.getStartAt() != null) bannerEntity.setStartAt(updateBannerReq.getStartAt());
        if (updateBannerReq.getEndAt() != null) bannerEntity.setEndAt(updateBannerReq.getEndAt());
        if (updateBannerReq.getSortOrder() != null) bannerEntity.setSortOrder(updateBannerReq.getSortOrder());

        // 시간 검증
        if (bannerEntity.getStartAt() != null && bannerEntity.getEndAt() != null &&
                bannerEntity.getEndAt().isBefore(bannerEntity.getStartAt())) {
            throw new IllegalArgumentException("종료 시간은 시작 시간보다 빠를 수 없습니다.");
        }

        if (multipartFile != null && !multipartFile.isEmpty()) {
            String newUrl = bannerImageStorage.replaceBannerImage(bannerEntity.getImageUrl(), multipartFile);
            bannerEntity.setImageUrl(newUrl); // JPA 변경감지로 커밋 시 저장
        }
        return UpdateBannerRes.from(bannerEntity);
    }

    /*배너 삭제 =========================================================================================
     * 관리자용 배너 수정 메서드 (페이징)
     */
    @Override
    public void deleteBanner(Long bannerId) {
        if (!isAdmin()) throw new AccessDeniedException("관리자 권한이 필요합니다.");

        BannerEntity e = bannerJpaRepository.findById(bannerId)
                .orElseThrow(() -> new IllegalArgumentException("배너가 존재하지 않습니다. id=" + bannerId));

        // 파일 삭제 실패가 DB 삭제를 막지 않도록 예외 삼켜서 로깅만
        try {
            bannerImageStorage.deleteByUrl(e.getImageUrl());
        } catch (Exception ex) {
            log.error("[banner:delete] image delete failed id={}, url={}", e.getId(), e.getImageUrl(), ex);
        }

        try {
            bannerJpaRepository.delete(e);
        } catch (DataIntegrityViolationException dive) {
            // FK가 걸려 있다면 여기서 터질 수 있음
            throw new IllegalStateException("배너를 참조 중인 데이터가 있어 삭제할 수 없습니다.", dive);
        }

        log.info("[banner:delete] id={} deleted", bannerId);
    }

    /*배너 메인홈 노출용 서비스 ===================================================================================*/
    @Override
    @Transactional(readOnly = true)
    public List<HomeBannerDTO> getHomeBanners() {
        LocalDateTime now = LocalDateTime.now();
        var top5 = bannerJpaRepository.findDisplayable(now, PageRequest.of(0, 5));
        return top5.stream()
                .map(HomeBannerDTO::from)
                .toList();
    }
}



