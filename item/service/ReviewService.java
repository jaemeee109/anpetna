package com.anpetna.item.service;

import com.anpetna.item.dto.ReviewDTO;
import com.anpetna.item.dto.deleteReview.DeleteReviewReq;
import com.anpetna.item.dto.deleteReview.DeleteReviewRes;
import com.anpetna.item.dto.modifyReview.ModifyReviewReq;
import com.anpetna.item.dto.modifyReview.ModifyReviewRes;
import com.anpetna.item.dto.registerReview.RegisterReviewReq;
import com.anpetna.item.dto.registerReview.RegisterReviewRes;
import com.anpetna.item.dto.searchAllReview.SearchAllReviewsReq;
import com.anpetna.item.dto.searchAllReview.SearchAllReviewsRes;
import com.anpetna.item.dto.searchOneReview.SearchOneReviewReq;
import com.anpetna.item.dto.searchOneReview.SearchOneReviewRes;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

public interface ReviewService {


    RegisterReviewRes registerReview(RegisterReviewReq req);

    @PreAuthorize("@authEvaluator.authorizeReview(#req.reviewId, principal.getUsername())")
    ModifyReviewRes modifyReview(ModifyReviewReq req);

    @PreAuthorize("@authEvaluator.authorizeReview(#req.reviewId, principal.getUsername())")
    DeleteReviewRes deleteReview(DeleteReviewReq req);

    List<ReviewDTO> getAllReviews(SearchAllReviewsReq req);

    SearchOneReviewRes getOneReview(SearchOneReviewReq req);

}
