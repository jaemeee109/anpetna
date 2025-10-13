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
        final SortDirection dir = (req.getDirection() != null)
                ? req.getDirection()
                : SortDirection.DESCENDING;

        final var where = qReview.itemId.itemId.eq(req.getItemId());
        final OrderSpecifier<?> orderSpec =
                (dir == SortDirection.ASCENDING) ? qReview.regDate.asc() : qReview.regDate.desc();

        return queryFactory
                .selectFrom(qReview)
                .leftJoin(qReview.memberId).fetchJoin()
                .leftJoin(qReview.itemId).fetchJoin()
                .where(where)
                .orderBy(orderSpec)
                .fetch();
    }



    @Override
    public List<ReviewEntity> orderByRating(SearchAllReviewsReq req) {
        final SortDirection dir = (req.getDirection() != null)
                ? req.getDirection()
                : SortDirection.DESCENDING;

        final var where = qReview.itemId.itemId.eq(req.getItemId());
        final OrderSpecifier<?>[] orderSpec = (dir == SortDirection.ASCENDING)
                ? new OrderSpecifier<?>[]{ qReview.rating.asc(), qReview.regDate.asc() }
                : new OrderSpecifier<?>[]{ qReview.rating.desc(), qReview.regDate.desc() };

        return queryFactory
                .selectFrom(qReview)
                .leftJoin(qReview.memberId).fetchJoin()
                .leftJoin(qReview.itemId).fetchJoin()
                .where(where)
                .orderBy(orderSpec)
                .fetch();
    }



    @Override
    public Page<ReviewEntity> findByRegDate(Long itemId, SortDirection direction, Pageable pageable) {

        final SortDirection dir = (direction != null) ? direction : SortDirection.DESCENDING;
        final var where = qReview.itemId.itemId.eq(itemId);

        final OrderSpecifier<?>[] orderSpec = (dir == SortDirection.ASCENDING)
                ? new OrderSpecifier<?>[]{ qReview.regDate.asc() }
                : new OrderSpecifier<?>[]{ qReview.regDate.desc() };

        final List<ReviewEntity> content = queryFactory
                .selectFrom(qReview)
                .leftJoin(qReview.memberId).fetchJoin()
                .leftJoin(qReview.itemId).fetchJoin()
                .where(where)
                .orderBy(orderSpec)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        final Long total = queryFactory
                .select(qReview.count())
                .from(qReview)
                .where(where)
                .fetchOne();

        return new PageImpl<>(content, pageable, (total == null) ? 0L : total);
    }



    @Override
    public Page<ReviewEntity> findByRating(Long itemId, SortDirection direction, Pageable pageable) {

        final SortDirection dir = (direction != null) ? direction : SortDirection.DESCENDING;
        final var where = qReview.itemId.itemId.eq(itemId);

        final OrderSpecifier<?>[] orderSpec = (dir == SortDirection.ASCENDING)
                ? new OrderSpecifier<?>[]{ qReview.rating.asc(), qReview.regDate.asc() }
                : new OrderSpecifier<?>[]{ qReview.rating.desc(), qReview.regDate.desc() };

        final List<ReviewEntity> content = queryFactory
                .selectFrom(qReview)
                .leftJoin(qReview.memberId).fetchJoin()
                .leftJoin(qReview.itemId).fetchJoin()
                .where(where)
                .orderBy(orderSpec)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        final Long total = queryFactory
                .select(qReview.count())
                .from(qReview)
                .where(where)
                .fetchOne();

        return new PageImpl<>(content, pageable, (total == null) ? 0L : total);
    }


    //예외처리해야함..
}
