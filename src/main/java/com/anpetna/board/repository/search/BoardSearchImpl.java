package com.anpetna.board.repository.search;

import com.anpetna.board.domain.BoardEntity;
import com.anpetna.board.domain.QBoardEntity;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.dsl.Wildcard;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.ArrayList;
import java.util.List;

public class BoardSearchImpl implements BoardSearch {

    private final JPAQueryFactory queryFactory;
    private static final QBoardEntity board = QBoardEntity.boardEntity;

    public BoardSearchImpl(EntityManager em) {
        this.queryFactory = new JPAQueryFactory(em);
    }

    @Override
    public Page<BoardEntity> search(Pageable pageable, String[] types, String keyword) {

        BooleanBuilder builder = new BooleanBuilder();
        if (keyword != null && !keyword.isBlank() && types != null) {
            for (String t : types) {
                switch (t) {
                    case "t" -> builder.or(board.bTitle.containsIgnoreCase(keyword));
                    case "c" -> builder.or(board.bContent.containsIgnoreCase(keyword));
                    case "w" -> builder.or(board.bWriter.containsIgnoreCase(keyword));
                }
            }
        }

        // 정렬(옵션): pageable의 sort 반영
        List<OrderSpecifier<?>> orders = new ArrayList<>();
        pageable.getSort().forEach(o -> {
            OrderSpecifier<?> spec = switch (o.getProperty()) {
                case "createDate" -> o.isAscending() ? board.createDate.asc() : board.createDate.desc();
                case "bViewCount" -> o.isAscending() ? board.bViewCount.asc() : board.bViewCount.desc();
                case "bLikeCount" -> o.isAscending() ? board.bLikeCount.asc() : board.bLikeCount.desc();
                default -> o.isAscending() ? board.createDate.asc() : board.createDate.desc();
            };
            orders.add(spec);
        });
        if (orders.isEmpty()) {
            orders.add(board.createDate.desc());
        }

        // 본문 조회
        List<BoardEntity> content = queryFactory
                .selectFrom(board)
                .where(builder)
                .orderBy(orders.toArray(OrderSpecifier[]::new))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        // 총 개수 (fetchCount() 대체)
        Long total = queryFactory
                .select(Wildcard.count)
                .from(board)
                .where(builder)
                .fetchOne();

        return new PageImpl<>(content, pageable, total == null ? 0 : total);
    }
}
