package com.anpetna.item.dto.searchOneReview;

import lombok.Setter;

import java.time.LocalDateTime;

@Setter
public class SearchOneReviewRes {

    private Long reviewId;

    private String content;

    private int rating;

    private LocalDateTime regDate;

    private Long itemId;

    private String imageUrl;

}
