package com.anpetna.order.domain;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QOrdersEntity is a Querydsl query type for OrdersEntity
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QOrdersEntity extends EntityPathBase<OrdersEntity> {

    private static final long serialVersionUID = -1211256132L;

    public static final QOrdersEntity ordersEntity = new QOrdersEntity("ordersEntity");

    public final StringPath cardId = createString("cardId");

    public final StringPath memberId = createString("memberId");

    public final ListPath<OrderEntity, QOrderEntity> orderItems = this.<OrderEntity, QOrderEntity>createList("orderItems", OrderEntity.class, QOrderEntity.class, PathInits.DIRECT2);

    public final NumberPath<Long> ordersId = createNumber("ordersId", Long.class);

    public final NumberPath<Integer> totalAmount = createNumber("totalAmount", Integer.class);

    public QOrdersEntity(String variable) {
        super(OrdersEntity.class, forVariable(variable));
    }

    public QOrdersEntity(Path<? extends OrdersEntity> path) {
        super(path.getType(), path.getMetadata());
    }

    public QOrdersEntity(PathMetadata metadata) {
        super(OrdersEntity.class, metadata);
    }

}

