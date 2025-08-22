package com.anpetna.item.service;

import com.anpetna.item.config.ItemMapper;
import com.anpetna.item.config.ReviewMapper;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.domain.ReviewEntity;
import com.anpetna.item.dto.ItemDTO;
import com.anpetna.item.dto.ReviewDTO;
import com.anpetna.item.dto.deleteItem.DeleteItemRes;
import com.anpetna.item.dto.deleteReview.DeleteReviewReq;
import com.anpetna.item.dto.deleteReview.DeleteReviewRes;
import com.anpetna.item.dto.modifyItem.ModifyItemRes;
import com.anpetna.item.dto.modifyReview.ModifyReviewReq;
import com.anpetna.item.dto.modifyReview.ModifyReviewRes;
import com.anpetna.item.dto.registerReview.RegisterReviewReq;
import com.anpetna.item.dto.registerReview.RegisterReviewRes;
import com.anpetna.item.dto.searchAllReview.SearchAllReviewsReq;
import com.anpetna.item.dto.searchAllReview.SearchAllReviewsRes;
import com.anpetna.item.dto.searchOneReview.SearchOneReviewReq;
import com.anpetna.item.dto.searchOneReview.SearchOneReviewRes;
import com.anpetna.item.repository.ItemJpaRepository;
import com.anpetna.item.repository.ReviewJpaRepository;
import jakarta.persistence.EntityNotFoundException;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

//  item(ONE)을 등록하면 image(MANY)가 등록
//  review(ONE)을 등록하면 item(ONE)가 등록
//  item(ONE)를 조회하면 관련된 review(MANY)가 조회 (회우너이 본인 정보 조회하는 것과 비슷한 맥락)
@Service
public class ReviewServiceImpl implements ReviewService {

    private final ReviewJpaRepository repository;
    private final ModelMapper modelMapper;
    private final ReviewMapper reviewMapper;

    public ReviewServiceImpl(ReviewJpaRepository repository, ModelMapper modelMapper, ReviewMapper reviewMapper) {
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
    public List<ReviewDTO> getAllReviews(SearchAllReviewsReq req) {
        List<ReviewEntity> found = null;
        //  사용자는 둘 중 하나를 선택하고 DTO에는 값이 하나만 지정된다.
        if (req.getOrderByRegDate() != null){
            found = repository.orderByRegDate(req);
        }else if (req.getOrderByRating() != null){
            found = repository.orderByRating(req);
        }

        List<ReviewDTO> res  = null;
        found.forEach(reviewEntity -> {
            res.add(reviewMapper.rReviewMapRes().map(reviewEntity));
        });

        return res;
    }


}
