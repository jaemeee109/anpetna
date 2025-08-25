package com.anpetna.item.repository;

import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.domain.ReviewEntity;
import com.anpetna.item.dto.searchAllItem.SearchAllItemsReq;
import com.anpetna.item.dto.searchAllReview.SearchAllReviewsReq;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepositoryCustom {

    List<ReviewEntity> orderByRegDate(SearchAllReviewsReq req);

    List<ReviewEntity> orderByRating(SearchAllReviewsReq req);

}
