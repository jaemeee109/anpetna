package com.anpetna.board.repository.search;

import com.anpetna.board.constant.BoardType;
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
        // (기존 구현 유지)
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
        if (orders.isEmpty()) orders.add(board.createDate.desc());

        List<BoardEntity> content = queryFactory
                .selectFrom(board)
                .where(builder)
                .orderBy(orders.toArray(OrderSpecifier[]::new))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long total = queryFactory
                .select(Wildcard.count)
                .from(board)
                .where(builder)
                .fetchOne();

        return new PageImpl<>(content, pageable, total == null ? 0 : total);
    }

// src/main/java/com/anpetna/board/repository/search/BoardSearchImpl.java

    @Override
    public Page<BoardEntity> searchByBoardType(Pageable pageable, BoardType boardType, String[] types, String keyword) {
        BooleanBuilder builder = new BooleanBuilder();

        // 1) boardType = QNA 를 먼저 고정
        if (boardType != null) {
            builder.and(board.boardType.eq(boardType));
        }

        // 2) (title OR content OR writer) 는 별도의 그룹으로 묶고, 최종적으로 AND 로 결합
        if (keyword != null && !keyword.isBlank() && types != null && types.length > 0) {
            BooleanBuilder kw = new BooleanBuilder();
            for (String t : types) {
                switch (t) {
                    case "t" -> kw.or(board.bTitle.containsIgnoreCase(keyword));
                    case "c" -> kw.or(board.bContent.containsIgnoreCase(keyword));
                    case "w" -> kw.or(board.bWriter.containsIgnoreCase(keyword));
                }
            }
            builder.and(kw);
        }

        // 정렬
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
        if (orders.isEmpty()) orders.add(board.createDate.desc());

        // 조회
        List<BoardEntity> content = queryFactory
                .selectFrom(board)
                .where(builder)
                .orderBy(orders.toArray(OrderSpecifier[]::new))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long total = queryFactory
                .select(Wildcard.count)
                .from(board)
                .where(builder)
                .fetchOne();

        return new PageImpl<>(content, pageable, total == null ? 0 : total);
    }

}
