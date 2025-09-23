package com.anpetna.banner.service;

import com.anpetna.banner.dto.HomeBannerDTO;
import com.anpetna.banner.dto.createBanner.CreateBannerReq;
import com.anpetna.banner.dto.createBanner.CreateBannerRes;
import com.anpetna.banner.dto.readBanner.ReadBannerRes;
import com.anpetna.banner.dto.updateBanner.UpdateBannerReq;
import com.anpetna.banner.dto.updateBanner.UpdateBannerRes;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface BannerService {

    /*배너 생성*/
    CreateBannerRes createBanner(CreateBannerReq createBannerReq, MultipartFile multipartFile);

    /*배너 목록 전체 조회*/
    Page<ReadBannerRes> readBanner(Pageable pageable);

    /*배너 수정*/
    UpdateBannerRes updateBanner(Long bannerId, UpdateBannerReq updateBannerReq, MultipartFile multipartFile);

    /*배너 삭제*/
    void deleteBanner(Long bannerId);

    /*메인 홈 노출용 배너 목록*/
    List<HomeBannerDTO> getHomeBanners();
}
