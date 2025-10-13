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
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.hibernate.query.SortDirection;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/item/{itemId}/review")
@Log4j2
@RequiredArgsConstructor
public class ReviewController {

    //  SpEL : 코드 안에서 동적으로 조건을 평가하고 권한/로직 판단에 활용할 수 있는 Spring 전용 표현식 언어

    private final ReviewService reviewService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ApiResult<RegisterReviewRes> registerReview(
            @PathVariable Long itemId,
            @RequestPart("json") @Valid RegisterReviewReq req,
            @RequestPart(value = "image", required = false) MultipartFile image
    ) {
        var postResult = reviewService.registerReview(itemId, req, image);
        return new ApiResult<>(postResult);
    }

    @PutMapping(value = "/{reviewId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ApiResult<ModifyReviewRes> updateReview(
            @PathVariable Long itemId,
            @PathVariable Long reviewId,
            @RequestPart("json") @Valid ModifyReviewReq req,
            @RequestPart(value = "image", required = false) MultipartFile image
    ) {
        var putResult = reviewService.modifyReview(itemId, reviewId, req, image);
        return new ApiResult<>(putResult);
    }


    @DeleteMapping("/{reviewId}")
    @PreAuthorize("isAuthenticated()")
    public ApiResult<DeleteReviewRes> deleteReview(
            @PathVariable Long itemId,
            @PathVariable Long reviewId
    ) {
        DeleteReviewReq req = new DeleteReviewReq();
        req.setReviewId(reviewId);
        var deleteResult = reviewService.deleteReview(itemId, req);
        return new ApiResult<>(deleteResult);
    }



    @GetMapping("/{reviewId}")
    public ApiResult<SearchOneReviewRes> searchOneReview(@PathVariable String itemId, @PathVariable Long reviewId) {
        var req = new SearchOneReviewReq();
        req.setReviewId(reviewId);
        var getOneResult = reviewService.getOneReview(req);
        return new ApiResult<>(getOneResult);
    }

    @GetMapping
    public ApiResult<PageResponseDTO<ReviewDTO>> searchAllReviews(
            @PathVariable Long itemId,
            @RequestParam(name = "order", required = false, defaultValue = "rating") String order,
            @RequestParam(name = "direction", required = false) SortDirection sortDirection,
            PageRequestDTO pageRequestDTO
    ) {
        // "date" | "rating" 외 값이면 "rating" 고정
        final String safeOrder = (
                "date".equalsIgnoreCase(order) || "rating".equalsIgnoreCase(order)
        ) ? order.toLowerCase() : "rating";

        // null 이면 DESCENDING
        final SortDirection safeDirection = (sortDirection != null)
                ? sortDirection : SortDirection.DESCENDING;

        SearchAllReviewsReq req = new SearchAllReviewsReq();
        req.setItemId(itemId);
        req.setDirection(safeDirection);

        PageResponseDTO<ReviewDTO> page = reviewService.getAllReviews(req, pageRequestDTO, safeOrder);
        return new ApiResult<>(page);
    }

}
