package com.anpetna.board.dto;

import com.anpetna.board.domain.BoardEntity;
import com.anpetna.board.constant.BoardType;
import com.anpetna.coreDomain.ImageEntity;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
public class BoardDTO {

    private Long bno;
    private String bTitle;
    private String bContent;
    private int bViewCount;
    private int bLikeCount;
    private String bWriter;
    private BoardType boardType;
    private Boolean noticeFlag;
    private Boolean isSecret;
    private LocalDateTime createDate;
    private LocalDateTime latestDate;

    // 이미지 URL 리스트
    private List<String> imageUrls;

    // BoardEntity -> BoardDTO 변환 생성자
    public BoardDTO(BoardEntity entity) {
        this.bno = entity.getBno();
        this.bTitle = entity.getBTitle();
        this.bContent = entity.getBContent();
        this.bViewCount = entity.getBViewCount();
        this.bLikeCount = entity.getBLikeCount();
        this.bWriter = entity.getBWriter();
        this.boardType = entity.getBoardType();
        this.noticeFlag = entity.getNoticeFlag();
        this.isSecret = entity.getIsSecret();
        this.createDate = entity.getCreateDate();
        this.latestDate = entity.getLatestDate();

        // BoardEntity에 연결된 ImageEntity들의 URL 리스트 추출
        this.imageUrls = entity.getImages()
                .stream()
                .map(ImageEntity::getUrl)
                .collect(Collectors.toList());
    }
}
