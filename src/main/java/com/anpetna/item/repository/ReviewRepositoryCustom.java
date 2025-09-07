package com.anpetna.item.repository;

import com.anpetna.item.domain.ReviewEntity;
import com.anpetna.item.dto.searchAllReview.SearchAllReviewsReq;
import org.hibernate.query.SortDirection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepositoryCustom {

    List<ReviewEntity> orderByRegDate(SearchAllReviewsReq req);

    List<ReviewEntity> orderByRating(SearchAllReviewsReq req);

    Page<ReviewEntity> findByRegDate(Long itemId, SortDirection direction, Pageable pageable);
    Page<ReviewEntity> findByRating(Long itemId, SortDirection direction, Pageable pageable);

}
