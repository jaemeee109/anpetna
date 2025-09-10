package com.anpetna.item.repository;

import com.anpetna.item.domain.QReviewEntity;
import com.anpetna.item.domain.ReviewEntity;
import com.anpetna.item.dto.searchAllReview.SearchAllReviewsReq;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.hibernate.query.SortDirection;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
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
        var dir = req.getDirection();
        var where = qReview.itemId.itemId.eq(req.getItemId());

        if (dir == null || dir == SortDirection.DESCENDING) {
            return queryFactory.selectFrom(qReview)
                    .where(where)
                    .orderBy(qReview.regDate.desc())
                    .fetch();
        } else {
            return queryFactory.selectFrom(qReview)
                    .where(where)
                    .orderBy(qReview.regDate.asc())
                    .fetch();
        }
    }

    @Override
    public List<ReviewEntity> orderByRating(SearchAllReviewsReq req) {
        var dir = req.getDirection();
        var where = qReview.itemId.itemId.eq(req.getItemId());

        if (dir == null || dir == SortDirection.DESCENDING) {
            return queryFactory.selectFrom(qReview)
                    .where(where)
                    .orderBy(qReview.rating.desc(), qReview.regDate.desc())
                    .fetch();
        } else {
            return queryFactory.selectFrom(qReview)
                    .where(where)
                    .orderBy(qReview.rating.asc(), qReview.regDate.asc())
                    .fetch();
        }
    }


    @Override
    public Page<ReviewEntity> findByRegDate(Long itemId, SortDirection direction, Pageable pageable) {

        var where = qReview.itemId.itemId.eq(itemId);

        OrderSpecifier<?>[] order = (direction == null || direction == SortDirection.DESCENDING)
                ? new OrderSpecifier<?>[] {qReview.regDate.desc()}
                : new OrderSpecifier<?>[] {qReview.regDate.asc()};

        List<ReviewEntity> content = queryFactory
                .selectFrom(qReview)
                .where(where)
                .orderBy(order)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long total = queryFactory
                .select(qReview.count())
                .from(qReview)
                .where(where)
                .fetchOne();

        return new PageImpl<>(content, pageable, total == null ? 0L : total);
    }

    @Override
    public Page<ReviewEntity> findByRating(Long itemId, SortDirection direction, Pageable pageable) {

        var where = qReview.itemId.itemId.eq(itemId);

        OrderSpecifier<?>[] order = (direction == null || direction == SortDirection.DESCENDING)
                ? new OrderSpecifier<?>[] {qReview.rating.desc(), qReview.regDate.desc()}
                : new OrderSpecifier<?>[] {qReview.rating.asc(), qReview.regDate.asc()};

        List<ReviewEntity> content = queryFactory
                .selectFrom(qReview)
                .where(where)
                .orderBy(order)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long total = queryFactory
                .select(qReview.count())
                .from(qReview)
                .where(where)
                .fetchOne();

        return new PageImpl<>(content, pageable, total == null ? 0L : total);
    }
    //예외처리해야함..
}
