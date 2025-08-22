package com.anpetna.item.repository;

import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.domain.QItemEntity;
import com.anpetna.item.dto.searchAllItem.SearchAllItemsReq;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.hibernate.query.SortDirection;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class ItemRepositoryCustomImpl implements ItemRepositoryCustom {

    //  QuerydslRepositorySupport 대신 Repository를 custom하여 ItemJPARepository에 상속
    //  custom시

    QItemEntity qItem = QItemEntity.itemEntity;
    private final JPAQueryFactory queryFactory;

    @Autowired
    public ItemRepositoryCustomImpl(EntityManager em) {
        this.queryFactory = new JPAQueryFactory(em);
    }

    @Override
    public List<ItemEntity> sortByCategory(SearchAllItemsReq req) {

        return queryFactory.selectFrom(qItem)
                .where(qItem.itemCategory.eq(req.getSortByCategory()))
                .fetch();
    }

    @Override
    public List<ItemEntity> sortBySales(SearchAllItemsReq req) {

        return queryFactory.selectFrom(qItem)
                .where(qItem.itemCategory.eq(req.getSortByCategory()))
                .fetch();
    }

    @Override
    public List<ItemEntity> orderByPriceDir(SearchAllItemsReq req) {
        var dir =  req.getOrderByPriceDir();
        if (dir.equals(SortDirection.DESCENDING)) {
            return queryFactory.selectFrom(qItem)
                    .orderBy(qItem.itemPrice.desc())
                    .fetch();
        }else{
            return queryFactory.selectFrom(qItem)
                    .orderBy(qItem.itemPrice.asc())
                    .fetch();
        }
    }




    //예외처리해야함..
}
