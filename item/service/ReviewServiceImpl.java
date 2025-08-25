package com.anpetna.item.service;

import com.anpetna.item.config.ReviewMapper;
import com.anpetna.item.domain.ItemEntity;
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
import com.anpetna.item.repository.ItemRepository;
import com.anpetna.item.repository.ReviewRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

//  item(ONE)을 등록하면 image(MANY)가 등록
//  review(ONE)을 등록하면 item(ONE)가 등록
//  item(ONE)를 조회하면 관련된 review(MANY)가 조회 (회우너이 본인 정보 조회하는 것과 비슷한 맥락)
@Service
@RequiredArgsConstructor
@Log4j2
public class ReviewServiceImpl implements ReviewService {

    private final ItemRepository itemRepository;
    private final ReviewRepository reviewRepository;
    private final ModelMapper modelMapper;
    private final ReviewMapper reviewMapper;

    //해당 itemId가 실제 존재하는지 확인 (existsById / findById) (= 리뷰 쓸려고 했는데 상품이 그 사이 삭제되는 경우 검증)
    //유저가 실제 그 상품을 구매했는지 검증 (구매자만 리뷰 가능하도록)
    //별점 값 범위 검증(1~5) -> controller의 dto
    //중복 리뷰 제한(같은 주문에 대해 여러 번 작성 방지)

    /*자화자찬
    불필요한 DB 조회 제거
    예외 처리 명확 (404)
    매핑 문제 TypeMap으로 깔끔하게 해결
    */
    @Override
    public RegisterReviewRes registerReview(RegisterReviewReq req) {
        // Optional<ItemEntity> item = itemRepository.findById(req.getItemId()); -> 등록하는데 entity가 필요없음
        // review.setItem(entityManager.getReference(Item.class, itemId)); -> 프록시 객체 :  FK 연결 + 향후 상품 데이터 접근 가능
        if (!itemRepository.existsById(req.getItemId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,"상품이 존재하지 않습니다."); //404
        }
        ReviewEntity reqEntity = reviewMapper.cReviewMapReq().map(req); //  현재 dto의 Long과 entity의 ItemEntity타입 mapping 문제 -> typemap으로 해결
        ReviewEntity saved = reviewRepository.save(reqEntity);
        log.info(saved.toString());
        RegisterReviewRes res = modelMapper.map(saved, RegisterReviewRes.class);
        return res.registered();
    }

    @Override
    public ModifyReviewRes modifyReview(ModifyReviewReq req) {
        ReviewEntity found = reviewRepository.findById(req.getReviewId())   //db에서 찾아서
                .orElseThrow(()-> new ResponseStatusException(HttpStatus.NOT_FOUND, "리뷰가 존재하지 않습니다."));
        reviewMapper.uReviewMapReq().map(req, found);   //nullskip을 이용해 덮고
        ReviewEntity saved = reviewRepository.save(found);  //저장한다.
        ModifyReviewRes res = modelMapper.map(saved, ModifyReviewRes.class);
        return res.modified();
    }

    @Override
    public DeleteReviewRes deleteReview(DeleteReviewReq req) {
        reviewRepository.deleteById(req.getReviewId());
        DeleteReviewRes res = DeleteReviewRes.builder()
                .reviewId(req.getReviewId())
                .build();
        return res.deleted();
    }

    @Override
    public SearchOneReviewRes getOneReview(SearchOneReviewReq req) {
        Optional<ReviewEntity> found = reviewRepository.findById(req.getReviewId());
        ReviewEntity res = found.orElseThrow(() -> new EntityNotFoundException("Review not found with id: " + req.getReviewId()));
        return reviewMapper.r1ReviewMapRes().map(res);
    }

    @Override
    public List<ReviewDTO> getAllReviews(SearchAllReviewsReq req) {
        List<ReviewEntity> found = null;
        //  사용자는 둘 중 하나를 선택하고 DTO에는 값이 하나만 지정된다.
        if (req.getOrderByRegDate() != null){
            found = reviewRepository.orderByRegDate(req);
        }else if (req.getOrderByRating() != null){
            found = reviewRepository.orderByRating(req);
        }

        List<ReviewDTO> res  = null;
        found.forEach(reviewEntity -> {
            res.add(reviewMapper.rReviewMapRes().map(reviewEntity));
        });

        return res;
    }


}
