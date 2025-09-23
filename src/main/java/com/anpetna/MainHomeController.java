package com.anpetna;

import com.anpetna.banner.dto.HomeBannerDTO;
import com.anpetna.banner.service.BannerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/home")
@RequiredArgsConstructor
@Log4j2
public class MainHomeController {

    private final BannerService bannerService;

    /**
     * 메인 홈 노출용 배너 목록
     * GET /banner/home
     */
    @GetMapping("/Banner")
    public ApiResult<List<HomeBannerDTO>> getHomeBanners() {
        return new ApiResult<>(bannerService.getHomeBanners());
    }

    /*인가상품 나열용*/
}
