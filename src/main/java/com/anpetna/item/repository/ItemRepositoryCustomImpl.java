package com.anpetna.item.repository;

import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.constant.ItemSellStatus;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.domain.QItemEntity;
import com.anpetna.item.dto.searchAllItem.SearchAllItemsReq;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.core.types.dsl.NumberTemplate;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.hibernate.query.SortDirection;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import com.anpetna.order.constant.OrdersStatus;
import com.anpetna.order.domain.QOrderEntity;
import com.anpetna.order.domain.QOrdersEntity;
import com.querydsl.jpa.JPAExpressions;

import java.util.List;

import static com.querydsl.core.types.dsl.Expressions.asNumber;

@Repository
public class ItemRepositoryCustomImpl implements ItemRepositoryCustom {

    //  QuerydslRepositorySupport 대신 Repository를 custom하여 ItemJPARepository에 상속

    private final QItemEntity qItem = QItemEntity.itemEntity;
    private final JPAQueryFactory queryFactory;

    @Autowired
    public ItemRepositoryCustomImpl(EntityManager em) {
        this.queryFactory = new JPAQueryFactory(em);
    }

    // 조건1 : 카테고리와 일치해야 하고
    // 조건2 : 판매상태를 정렬에 고려
    @Override
    public Page<ItemEntity> orderBy(Pageable pageable, SearchAllItemsReq req) {
        // (1) 카테고리 조건
        BooleanBuilder builder = new BooleanBuilder();

        if (req.getItemCategory() != null && req.getItemCategory() != ItemCategory.ALL) {
            builder.and(qItem.itemCategory.eq(req.getItemCategory()));
        }

        if (req.getKeyword() != null && !req.getKeyword().isBlank()) {
            builder.and(qItem.itemName.containsIgnoreCase(req.getKeyword()));
        }

        // (2) 정렬 동적 조건 (기본: 최신순)
        OrderSpecifier<?> orderBy = qItem.createDate.desc();

        // 가격 정렬
        if (req.getOrderByPrice() != null) {
            if (req.getOrderByPrice().isAscending()) {
                orderBy = qItem.itemPrice.asc();
            } else if (req.getOrderByPrice().isDescending()) {
                orderBy = qItem.itemPrice.desc();
            }

            // 날짜 정렬
        } else if (req.getOrderByDate() != null) {
            if (req.getOrderByDate().isAscending()) {
                orderBy = qItem.createDate.asc();
            } else if (req.getOrderByDate().isDescending()) {
                orderBy = qItem.createDate.desc();
            }
        }
        // === 여기까지는 기존과 동일한 가격/날짜 정렬 ===

        // (3) 쿼리 구성
        boolean sortBySales = (req.getOrderBySales() != null);

        List<ItemEntity> rows;
        long totalCount;

        if (sortBySales) {
            // 판매량 정렬: 구매확정(OrdersStatus.CONFIRMATION) 건수 기준
            QOrderEntity qOrder = QOrderEntity.orderEntity;
            QOrdersEntity qOrders = QOrdersEntity.ordersEntity;

            // 구매확정이면 1, 아니면 0 -> 모두 합산 = 확정 건수
            NumberExpression<Integer> confirmCount = new CaseBuilder()
                    .when(qOrders.status.eq(OrdersStatus.CONFIRMATION)).then(1)
                    .otherwise(0)
                    .sum();

            // rows 조회 (LEFT JOIN + GROUP BY)
            if (req.getOrderBySales().isAscending()) {
                rows = queryFactory.selectFrom(qItem)
                        .leftJoin(qOrder).on(qOrder.item.eq(qItem))
                        .leftJoin(qOrder.orders, qOrders)
                        .where(builder)
                        .groupBy(qItem.itemId)
                        // 판매상태 우선(판매중 먼저) + 구매확정 건수 asc + 보조 정렬(orderBy)
                        .orderBy(qItem.itemSellStatus.desc(), confirmCount.asc(), orderBy)
                        .offset(pageable.getOffset())
                        .limit(pageable.getPageSize())
                        .fetch();
            } else {
                rows = queryFactory.selectFrom(qItem)
                        .leftJoin(qOrder).on(qOrder.item.eq(qItem))
                        .leftJoin(qOrder.orders, qOrders)
                        .where(builder)
                        .groupBy(qItem.itemId)
                        // 판매상태 우선 + 구매확정 건수 desc + 보조 정렬(orderBy)
                        .orderBy(qItem.itemSellStatus.desc(), confirmCount.desc(), orderBy)
                        .offset(pageable.getOffset())
                        .limit(pageable.getPageSize())
                        .fetch();
            }

            // totalCount (카테고리 필터만 반영, 판매량 정렬 여부와 무관하게 '아이템 개수' 기준)
            Long total = queryFactory.select(qItem.itemId.countDistinct())
                    .from(qItem)
                    .where(builder)
                    .fetchOne();
            totalCount = (total != null ? total : 0L);

        } else {
            // 판매량 정렬이 아닐 때: 기존 방식 유지 (조인/그룹바이 불필요)
            rows = queryFactory.selectFrom(qItem)
                    .where(builder)
                    .orderBy(qItem.itemSellStatus.desc(), orderBy) // 판매중 우선 + 선택 정렬
                    .offset(pageable.getOffset())
                    .limit(pageable.getPageSize())
                    .fetch();

            Long total = queryFactory.select(qItem.count())
                    .from(qItem)
                    .where(builder)
                    .fetchOne();
            totalCount = (total != null ? total : 0L);
        }

        return new PageImpl<>(rows, pageable, totalCount);
    }
}

// casebuilder는 데이터베이스 내의 정보의 상태를 인식해 수치화하지만
// 이 로직은 그냥 변수만 지정함...따라서 각 행의 정보를 반영하지 못함
/*int sellStatus;
if(qItem.itemSellStatus.equals(ItemSellStatus.SELL)){
    sellStatus = 1;
} else if (qItem.itemSellStatus.equals(ItemSellStatus.SOLD_OUT)){
    sellStatus = 0;
};*/
