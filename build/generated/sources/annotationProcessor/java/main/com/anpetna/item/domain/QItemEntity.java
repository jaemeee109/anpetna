package com.anpetna.item.domain;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QItemEntity is a Querydsl query type for ItemEntity
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QItemEntity extends EntityPathBase<ItemEntity> {

    private static final long serialVersionUID = 1794200923L;

    public static final QItemEntity itemEntity = new QItemEntity("itemEntity");

    public final com.anpetna.coreDomain.QBaseEntity _super = new com.anpetna.coreDomain.QBaseEntity(this);

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createDate = _super.createDate;

    public final ListPath<com.anpetna.coreDomain.ImageEntity, com.anpetna.coreDomain.QImageEntity> images = this.<com.anpetna.coreDomain.ImageEntity, com.anpetna.coreDomain.QImageEntity>createList("images", com.anpetna.coreDomain.ImageEntity.class, com.anpetna.coreDomain.QImageEntity.class, PathInits.DIRECT2);

    public final EnumPath<com.anpetna.item.constant.ItemCategory> itemCategory = createEnum("itemCategory", com.anpetna.item.constant.ItemCategory.class);

    public final StringPath itemDetail = createString("itemDetail");

    public final NumberPath<Long> itemId = createNumber("itemId", Long.class);

    public final StringPath itemName = createString("itemName");

    public final NumberPath<Integer> itemPrice = createNumber("itemPrice", Integer.class);

    public final EnumPath<com.anpetna.item.constant.ItemSaleStatus> itemSaleStatus = createEnum("itemSaleStatus", com.anpetna.item.constant.ItemSaleStatus.class);

    public final EnumPath<com.anpetna.item.constant.ItemSellStatus> itemSellStatus = createEnum("itemSellStatus", com.anpetna.item.constant.ItemSellStatus.class);

    public final NumberPath<Integer> itemStock = createNumber("itemStock", Integer.class);

    //inherited
    public final DateTimePath<java.time.LocalDateTime> latestDate = _super.latestDate;

    public QItemEntity(String variable) {
        super(ItemEntity.class, forVariable(variable));
    }

    public QItemEntity(Path<? extends ItemEntity> path) {
        super(path.getType(), path.getMetadata());
    }

    public QItemEntity(PathMetadata metadata) {
        super(ItemEntity.class, metadata);
    }

}

