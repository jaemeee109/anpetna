package com.anpetna.board.domain;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QBoardEntity is a Querydsl query type for BoardEntity
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBoardEntity extends EntityPathBase<BoardEntity> {

    private static final long serialVersionUID = 2070460861L;

    public static final QBoardEntity boardEntity = new QBoardEntity("boardEntity");

    public final com.anpetna.coreDomain.QBaseEntity _super = new com.anpetna.coreDomain.QBaseEntity(this);

    public final StringPath bContent = createString("bContent");

    public final NumberPath<Integer> bLikeCount = createNumber("bLikeCount", Integer.class);

    public final NumberPath<Long> bno = createNumber("bno", Long.class);

    public final EnumPath<com.anpetna.board.constant.BoardType> boardType = createEnum("boardType", com.anpetna.board.constant.BoardType.class);

    public final StringPath bTitle = createString("bTitle");

    public final NumberPath<Integer> bViewCount = createNumber("bViewCount", Integer.class);

    public final StringPath bWriter = createString("bWriter");

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createDate = _super.createDate;

    public final ListPath<com.anpetna.coreDomain.ImageEntity, com.anpetna.coreDomain.QImageEntity> images = this.<com.anpetna.coreDomain.ImageEntity, com.anpetna.coreDomain.QImageEntity>createList("images", com.anpetna.coreDomain.ImageEntity.class, com.anpetna.coreDomain.QImageEntity.class, PathInits.DIRECT2);

    public final BooleanPath isSecret = createBoolean("isSecret");

    //inherited
    public final DateTimePath<java.time.LocalDateTime> latestDate = _super.latestDate;

    public final BooleanPath noticeFlag = createBoolean("noticeFlag");

    public QBoardEntity(String variable) {
        super(BoardEntity.class, forVariable(variable));
    }

    public QBoardEntity(Path<? extends BoardEntity> path) {
        super(path.getType(), path.getMetadata());
    }

    public QBoardEntity(PathMetadata metadata) {
        super(BoardEntity.class, metadata);
    }

}

