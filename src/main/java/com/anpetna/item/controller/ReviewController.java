package com.anpetna.item.controller;

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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/reviews")
@Log4j2
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    @PreAuthorize("hasRole('USER')")
    //컨트롤러나 서비스 메서드 실행 전에 SpEL(Security Expression Language)로 권한 검증
    public ResponseEntity<RegisterReviewRes> registerItem(@RequestBody RegisterReviewReq req) {
        var postResult = reviewService.registerReview(req);
        return new ResponseEntity<>(postResult, HttpStatus.OK);
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ModifyReviewRes> updateItem(@RequestBody ModifyReviewReq req) {
        var putResult = reviewService.modifyReview(req);
        return new ResponseEntity<>(putResult, HttpStatus.OK);
    }

    @DeleteMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DeleteReviewRes> deleteItem(@RequestBody DeleteReviewReq req) {
        var deleteResult = reviewService.deleteReview(req);
        return new ResponseEntity<>(deleteResult, HttpStatus.OK);
    }


    @GetMapping("/{ItemId}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<SearchOneReviewRes> searchOneItem(@RequestBody SearchOneReviewReq req) {
        var getOneResult = reviewService.getOneReview(req);
        return new ResponseEntity<>(getOneResult, HttpStatus.OK);
    }

    @GetMapping("/{sortItem}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<List<ReviewDTO>> searchAllItems(@RequestBody SearchAllReviewsReq req) {
        var getAllResult = reviewService.getAllReviews(req);
        return new ResponseEntity<>(getAllResult, HttpStatus.OK);
    }

}
