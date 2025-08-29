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
@RequestMapping("/review")
@Log4j2
@RequiredArgsConstructor
public class ReviewController {

    //  SpEL : 코드 안에서 동적으로 조건을 평가하고 권한/로직 판단에 활용할 수 있는 Spring 전용 표현식 언어

    private final ReviewService reviewService;

    @PostMapping
    @PreAuthorize("hasRole('USER')")
    //컨트롤러나 서비스 메서드 실행 전에 SpEL(Security Expression Language)로 권한 검증
    public ResponseEntity<RegisterReviewRes> registerReview(@RequestBody RegisterReviewReq req) {
        var postResult = reviewService.registerReview(req);
        return new ResponseEntity<>(postResult, HttpStatus.OK);
    }

    @PutMapping
    public ResponseEntity<ModifyReviewRes> updateReview(@RequestBody ModifyReviewReq req) {
        var putResult = reviewService.modifyReview(req);
        return new ResponseEntity<>(putResult, HttpStatus.OK);
    }

    @DeleteMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DeleteReviewRes> deleteReview(@RequestBody DeleteReviewReq req) {
        var deleteResult = reviewService.deleteReview(req);
        return new ResponseEntity<>(deleteResult, HttpStatus.OK);
    }

    @GetMapping("/{ItemId}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<SearchOneReviewRes> searchOneReview(@RequestBody SearchOneReviewReq req) {
        var getOneResult = reviewService.getOneReview(req);
        return new ResponseEntity<>(getOneResult, HttpStatus.OK);
    }

    @GetMapping("/{sortItem}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<List<ReviewDTO>> searchAllReviews(@RequestBody SearchAllReviewsReq req) {
        var getAllResult = reviewService.getAllReviews(req);
        return new ResponseEntity<>(getAllResult, HttpStatus.OK);
    }
    //  @PreAuthorize("#id == principal.id")            // 요청 파라미터 id와 로그인 사용자 id 같을 때만 허용
}
