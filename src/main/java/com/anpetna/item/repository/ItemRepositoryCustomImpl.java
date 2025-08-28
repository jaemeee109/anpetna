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

import java.util.List;

import static com.querydsl.core.types.dsl.Expressions.asNumber;

@Repository
public class ItemRepositoryCustomImpl implements ItemRepositoryCustom {

    //  QuerydslRepositorySupport 대신 Repository를 custom하여 ItemJPARepository에 상속

    QItemEntity qItem = QItemEntity.itemEntity;
    private final JPAQueryFactory queryFactory;

    @Autowired
    public ItemRepositoryCustomImpl(EntityManager em) {
        this.queryFactory = new JPAQueryFactory(em);
    }

    // 조건1 : 카테고리와 일치해야하고
    // 조건2 : 판매상태를 정렬에 고려
    @Override
    public Page<ItemEntity> orderBy(Pageable pageable, SearchAllItemsReq req) {
        BooleanBuilder builder = new BooleanBuilder();
        CaseBuilder caseBuilder = new CaseBuilder();

        // 카테고리
        builder.and(qItem.itemCategory.eq(req.getItemCategory()));

        OrderSpecifier orderBy = null;
        // 정렬 동적 조건
        if (req.getOrderByPrice() != null) {
            if (req.getOrderByPrice().isAscending()) {
                orderBy = qItem.itemPrice.desc();
            } else if (req.getOrderByDate().isDescending()) {
                orderBy = qItem.itemPrice.asc();
            }
        }else if (req.getOrderByDate()!=null) {
            if (req.getOrderByDate().isAscending()){
                orderBy =  qItem.createDate.desc();
            } else if (req.getOrderByDate().isDescending()) {
                orderBy =  qItem.createDate.asc();
            }
        }
        // 디폴트 정해

        // 판매상태 & 최신순 정렬 적용
        List<ItemEntity> orderByDate =  queryFactory.selectFrom(qItem)
                .where(builder)
                .orderBy(qItem.itemSellStatus.desc(), orderBy)
                .offset(pageable.getOffset())  // 시작 위치
                .limit(pageable.getPageSize()) // 페이지 크기
                .fetch();

        return new PageImpl<>(orderByDate, pageable, orderByDate.size());
    }
}

// casebuilder는 데이터베이스 내의 정보의 상태를 인식해 수치화하지만
// 이 로직은 그냥 변수만 지정함...따라서 각 행의 정보를 반영하지 못함
        /*int sellStatus;
        if(qItem.itemSellStatus.equals(ItemSellStatus.SELL)){
            sellStatus = 1;
        }else if (qItem.itemSellStatus.equals(ItemSellStatus.SOLD_OUT)){
            sellStatus = 0;
        };*/