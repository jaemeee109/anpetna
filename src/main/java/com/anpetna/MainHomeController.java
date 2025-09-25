package com.anpetna;

import com.anpetna.banner.dto.HomeBannerDTO;
import com.anpetna.banner.service.BannerService;
import com.anpetna.board.dto.BoardDTO;
import com.anpetna.board.dto.likeCountTop5.LikeCountTop5Res;
import com.anpetna.board.dto.noticeTop5.NoticeTop5Res;
import com.anpetna.board.service.BoardService;
import com.anpetna.item.dto.popularItem.PopularItemReq;
import com.anpetna.item.dto.popularItem.PopularItemRes;
import com.anpetna.item.service.ItemService;
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
    private final ItemService itemService;
    private final BoardService boardService;

    /**
     * 메인 홈 노출용 배너 목록
     * GET /banner/home
     */
    @GetMapping("/Banner")
    public ApiResult<List<HomeBannerDTO>> getHomeBanners() {
        return new ApiResult<>(bannerService.getHomeBanners());
    }

    /*
    * 인가상품 나열용
    */
    @GetMapping("/itemRanking")
    public ApiResult<List<PopularItemRes>> getPopularItems(PopularItemReq req) {
        return new ApiResult<>(itemService.getPopularItems(req));
    }

    /*
    * 최신 공지글 나열용
    */
    @GetMapping("/noticeBoard")
    public ApiResult<List<NoticeTop5Res>> getNoticeTop5() {
        return new ApiResult<>(boardService.getNoticeTop5());
    }

    /*
    * 인기글 나열용
    */
    @GetMapping("/freeBoard")
    public ApiResult<List<LikeCountTop5Res>> getFreeBoard() {
        return new ApiResult<>(boardService.getLikeCountTop5());
    }
}
