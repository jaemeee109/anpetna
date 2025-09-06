package com.anpetna.item.service;

import com.anpetna.core.coreDto.PageRequestDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.item.config.ReviewMapper;
import com.anpetna.item.domain.ReviewEntity;
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
import com.anpetna.item.repository.ReviewRepository;
import jakarta.persistence.EntityNotFoundException;
import org.hibernate.query.SortDirection;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.Optional;

//  item(ONE)을 등록하면 image(MANY)가 등록
//  review(ONE)을 등록하면 item(ONE)가 등록
//  item(ONE)를 조회하면 관련된 review(MANY)가 조회 (회우너이 본인 정보 조회하는 것과 비슷한 맥락)
@Service
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository repository;
    private final ModelMapper modelMapper;
    private final ReviewMapper reviewMapper;

    public ReviewServiceImpl(ReviewRepository repository, ModelMapper modelMapper, ReviewMapper reviewMapper) {
        this.repository = repository;
        this.modelMapper = modelMapper;
        this.reviewMapper = reviewMapper;
    }

    @Override
    public RegisterReviewRes registerReview(RegisterReviewReq req) {
        ReviewEntity reqEntity = reviewMapper.cReviewMapReq().map(req);
        ReviewEntity saved = repository.save(reqEntity);
        RegisterReviewRes res = modelMapper.map(saved, RegisterReviewRes.class);
        return res.registered();
    }

    @Override
    public ModifyReviewRes modifyReview(ModifyReviewReq req) {
        ReviewEntity foundModified = reviewMapper.uReviewMapReq().map(req);
        ReviewEntity saved = repository.save(foundModified);
        ModifyReviewRes res = modelMapper.map(saved, ModifyReviewRes.class);
        return res.modified();
    }

    @Override
    public DeleteReviewRes deleteReview(DeleteReviewReq req) {
        repository.deleteById(req.getReviewId());
        DeleteReviewRes res = DeleteReviewRes.builder()
                .reviewId(req.getReviewId())
                .build();
        return res.deleted();
    }

    @Override
    public SearchOneReviewRes getOneReview(SearchOneReviewReq req) {
        Optional<ReviewEntity> found = repository.findById(req.getReviewId());
        ReviewEntity res = found.orElseThrow(() -> new EntityNotFoundException("Review not found with id: " + req.getReviewId()));
        return reviewMapper.r1ReviewMapRes().map(res);
    }

    @Override
    public PageResponseDTO<ReviewDTO> getAllReviews(SearchAllReviewsReq req, PageRequestDTO pageRequestDTO, String order) {

        if (req.getItemId() == null) {
            throw new IllegalArgumentException("ItemId is required");
        }

        Pageable pageable = pageRequestDTO.getPageable("rating", "regDate");

        SortDirection sortDirection = (req.getDirection() == null)
                ? SortDirection.DESCENDING
                : req.getDirection();

        Page<ReviewEntity> page;
        if ("rating".equalsIgnoreCase(order)) {
            page = repository.findByRating(req.getItemId(), sortDirection, pageable);
        }else {
            page = repository.findByRegDate(req.getItemId(), sortDirection, pageable);
        }

        Page<ReviewDTO> mapped = page.map(e -> reviewMapper.rReviewMapRes().map(e));

        return new PageResponseDTO<>(mapped);
    }


}
