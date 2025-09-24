package com.anpetna.banner.controller;

import com.anpetna.ApiResult;
import com.anpetna.banner.dto.createBanner.CreateBannerReq;
import com.anpetna.banner.dto.createBanner.CreateBannerRes;
import com.anpetna.banner.dto.readBanner.ReadBannerRes;
import com.anpetna.banner.dto.updateBanner.UpdateBannerReq;
import com.anpetna.banner.dto.updateBanner.UpdateBannerRes;
import com.anpetna.banner.service.BannerService;
import com.anpetna.core.coreDto.PageResponseDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/adminPage/banner")
@RequiredArgsConstructor
@Log4j2
public class AdminBannerController {

    /*의존성 주입*/
    private final BannerService bannerService;

    /**
     * =======================================================================================================
     * 관리자 - 배너 생성 엔드포인트 (Multipart)
     * 권한: ADMIN
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping(value = "/create", consumes = {"multipart/form-data"})
    //HTTP 요청 헤더의 Content-Type 이 multipart/form-data 인 요청만 매핑
    public ApiResult<CreateBannerRes> createBanner(
            @Valid @ModelAttribute CreateBannerReq createBannerReq,
            @RequestPart("image") MultipartFile multipartFile) {
        CreateBannerRes createBannerRes = bannerService.createBanner(createBannerReq, multipartFile);
        return new ApiResult<>(createBannerRes);
    }

    /**
     * =======================================================================================================
     * 관리자 - 배너 조회
     * 권한: ADMIN
     * 예: GET /adminPage/banner/list?page=0&size=10&sort=sortOrder,asc
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/allList")
    public ApiResult<PageResponseDTO<ReadBannerRes>> readBanner(Pageable pageable) {
        Page<ReadBannerRes> page = bannerService.readBanner(pageable);

        // ⚠️ PageResponseDTO(Page, Pageable) 내부 계산이 1-base 전제(첫 페이지=1)라
        // 첫 페이지일 때 마이너스/0 나오는 것을 피하려고 '표시용' Pageable을 1-base로 보정
        Pageable display = PageRequest.of(
                Math.max(1, pageable.getPageNumber() + 1), // 0→1, 1→2 ...3
                pageable.getPageSize()
        );

        return new ApiResult<>(new PageResponseDTO<>(page, display));
    }

    /**
     * =======================================================================================================
     * 배너 수정
     * 권한: ADMIN
     *
     * @param bannerId        수정할 배너 ID
     * @param updateBannerReq 수정 요청 DTO (부분 업데이트)
     * @param multipartFile   새 이미지 (선택)
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping(value = "/update/{bannerId}", consumes = {"multipart/form-data"})
    public ApiResult<UpdateBannerRes> updateBanner(
            @PathVariable Long bannerId,
            @Valid @ModelAttribute UpdateBannerReq updateBannerReq,
            @RequestPart(value = "image", required = false) MultipartFile multipartFile
    ) {
        return new ApiResult<>(bannerService.updateBanner(bannerId, updateBannerReq, multipartFile));
    }

    /**
     * =======================================================================================================
     * 배너 삭제
     * 권한: ADMIN
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/delete/{bannerId}")
    public ApiResult<Void> deleteBannerByPost(@PathVariable Long bannerId) {
        bannerService.deleteBanner(bannerId);
        return new ApiResult<>(null);
    }

}