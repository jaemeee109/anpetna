package com.anpetna.item.controller;

import com.anpetna.ApiResult;
import com.anpetna.core.coreDto.PageRequestDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.item.dto.ReviewDTO;
import com.anpetna.item.dto.deleteReview.DeleteReviewReq;
import com.anpetna.item.dto.deleteReview.DeleteReviewRes;
import com.anpetna.item.dto.modifyReview.ModifyReviewReq;
import com.anpetna.item.dto.modifyReview.ModifyReviewRes;
import com.anpetna.item.dto.registerReview.RegisterReviewReq;
import com.anpetna.item.dto.registerReview.RegisterReviewRes;
import com.anpetna.item.dto.searchAllReview.SearchAllReviewsReq;
import com.anpetna.item.dto.searchOneReview.SearchOneReviewReq;
import com.anpetna.item.dto.searchOneReview.SearchOneReviewRes;
import com.anpetna.item.service.ReviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.hibernate.query.SortDirection;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/item/{itemId}/review")
@Log4j2
@RequiredArgsConstructor
public class ReviewController {

    //  SpEL : 코드 안에서 동적으로 조건을 평가하고 권한/로직 판단에 활용할 수 있는 Spring 전용 표현식 언어

    private final ReviewService reviewService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ApiResult<RegisterReviewRes> registerReview(@PathVariable Long itemId, @RequestBody RegisterReviewReq req) {
        var res = reviewService.registerReview(itemId, req);
        return new ApiResult<>(res);
    }

    @PutMapping("/{ReviewId}")
    public ApiResult<ModifyReviewRes> updateReview(@PathVariable Long itemId, @RequestBody ModifyReviewReq req) {
        var putResult = reviewService.modifyReview(itemId, req.getReviewId(), req);
        return new ApiResult<>(putResult);
    }

    @DeleteMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResult<DeleteReviewRes> deleteReview(@PathVariable Long itemId, @RequestBody DeleteReviewReq req) {
        var deleteResult = reviewService.deleteReview(itemId, req);
        return new ApiResult<>(deleteResult);
    }

    @GetMapping("/{reviewId}")
    public ApiResult<SearchOneReviewRes> searchOneReview(@PathVariable Long reviewId, @PathVariable String itemId) {
        var req = new SearchOneReviewReq();
        req.setReviewId(reviewId);
        var getOneResult = reviewService.getOneReview(req);
        return new ApiResult<>(getOneResult);
    }

    @GetMapping
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ApiResult<PageResponseDTO<ReviewDTO>> searchAllReviews(
            @PathVariable Long itemId,
            @ModelAttribute PageRequestDTO pageRequestDTO,
            @RequestParam(name = "order", defaultValue = "date") String order,
            @RequestParam(name = "direction", required = false)SortDirection sortDirection) {
        var req = new SearchAllReviewsReq();
        req.setItemId(itemId);
        req.setDirection(sortDirection);
        var getAllResult = reviewService.getAllReviews(req, pageRequestDTO, order);
        return new ApiResult<>(getAllResult);
    }
}
