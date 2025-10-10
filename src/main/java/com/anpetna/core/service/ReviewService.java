package com.anpetna.core.service;

import com.anpetna.core.dto.PageRequestDTO;
import com.anpetna.core.dto.PageResponseDTO;
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
import org.springframework.web.multipart.MultipartFile;

public interface ReviewService {


    RegisterReviewRes registerReview(Long itemId, RegisterReviewReq req, MultipartFile image);
   // @PreAuthorize("@authEvaluator.authorizeReview(#req.reviewId, principal.getUsername())")
    ModifyReviewRes modifyReview(Long itemId, Long reviewId, ModifyReviewReq req, MultipartFile image);
    //@PreAuthorize("@authEvaluator.authorizeReview(#req.reviewId, principal.getUsername())")
    DeleteReviewRes deleteReview(Long itemId, DeleteReviewReq req);

    PageResponseDTO<ReviewDTO> getAllReviews(SearchAllReviewsReq req, PageRequestDTO pageRequestDTO, String order);

    SearchOneReviewRes getOneReview(SearchOneReviewReq req);

}
