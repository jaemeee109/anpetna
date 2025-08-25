package com.anpetna.item.repository;

import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.domain.QItemEntity;
import com.anpetna.item.domain.QReviewEntity;
import com.anpetna.item.domain.ReviewEntity;
import com.anpetna.item.dto.searchAllItem.SearchAllItemsReq;
import com.anpetna.item.dto.searchAllReview.SearchAllReviewsReq;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.hibernate.query.SortDirection;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class ReviewRepositoryCustomImpl implements ReviewRepositoryCustom {

    QReviewEntity qReview = QReviewEntity.reviewEntity;
    private final JPAQueryFactory queryFactory;

    @Autowired
    public ReviewRepositoryCustomImpl(EntityManager em) {
        this.queryFactory = new JPAQueryFactory(em);
    }

    @Override
    public List<ReviewEntity> orderByRegDate(SearchAllReviewsReq req) {
        var dir =  req.getDirection();
        if (dir.equals(SortDirection.DESCENDING)) {
            return queryFactory.selectFrom(qReview)
                    .orderBy(qReview.createDate.desc())
                    .fetch();
        }else{
            return queryFactory.selectFrom(qReview)
                    .orderBy(qReview.createDate.asc())
                    .fetch();
        }
    }

    @Override
    public List<ReviewEntity> orderByRating(SearchAllReviewsReq req) {
        var dir =  req.getDirection();
        if (dir.equals(SortDirection.DESCENDING)) {
            return queryFactory.selectFrom(qReview)
                    .orderBy(qReview.rating.desc())
                    .fetch();
        }else{
            return queryFactory.selectFrom(qReview)
                    .orderBy(qReview.rating.asc())
                    .fetch();
        }
    }
    //예외처리해야함..
}
