package com.anpetna.item.dto.searchOneReview;

import com.anpetna.core.coreDto.ImageListDTO;
import com.anpetna.item.dto.ItemDTO;

import java.time.LocalDateTime;

public class SearchOneReviewRes extends ImageListDTO {

    private Long reviewId;

    private String content;

    private int rating;

    private LocalDateTime regDate;

    private ItemDTO itemId;


}
