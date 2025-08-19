package com.anpetna.coreDomain;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QImageEntity is a Querydsl query type for ImageEntity
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QImageEntity extends EntityPathBase<ImageEntity> {

    private static final long serialVersionUID = -1104978967L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QImageEntity imageEntity = new QImageEntity("imageEntity");

    public final com.anpetna.board.domain.QBoardEntity board;

    public final StringPath fileName = createString("fileName");

    public final com.anpetna.item.domain.QItemEntity item;

    public final com.anpetna.member.domain.QMemberEntity member;

    public final com.anpetna.item.domain.QReviewEntity review;

    public final NumberPath<Integer> sortOrder = createNumber("sortOrder", Integer.class);

    public final StringPath url = createString("url");

    public final NumberPath<Long> uuid = createNumber("uuid", Long.class);

    public QImageEntity(String variable) {
        this(ImageEntity.class, forVariable(variable), INITS);
    }

    public QImageEntity(Path<? extends ImageEntity> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QImageEntity(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QImageEntity(PathMetadata metadata, PathInits inits) {
        this(ImageEntity.class, metadata, inits);
    }

    public QImageEntity(Class<? extends ImageEntity> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.board = inits.isInitialized("board") ? new com.anpetna.board.domain.QBoardEntity(forProperty("board")) : null;
        this.item = inits.isInitialized("item") ? new com.anpetna.item.domain.QItemEntity(forProperty("item")) : null;
        this.member = inits.isInitialized("member") ? new com.anpetna.member.domain.QMemberEntity(forProperty("member")) : null;
        this.review = inits.isInitialized("review") ? new com.anpetna.item.domain.QReviewEntity(forProperty("review"), inits.get("review")) : null;
    }

}

