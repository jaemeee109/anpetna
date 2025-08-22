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

import java.util.List;

public interface ReviewService {

    RegisterReviewRes registerReview(RegisterReviewReq req);

    ModifyReviewRes modifyReview(ModifyReviewReq req);

    DeleteReviewRes deleteReview(DeleteReviewReq req);

    List<ReviewDTO> getAllReviews(SearchAllReviewsReq req);

    SearchOneReviewRes getOneReview(SearchOneReviewReq req);

}
