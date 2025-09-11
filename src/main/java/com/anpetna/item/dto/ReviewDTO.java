package com.anpetna.item.dto;

import lombok.Setter;

import java.time.LocalDateTime;

@Setter
public class ReviewDTO {

    private Long reviewId;

    private String content;

    private int rating;

    private LocalDateTime regDate;

    private ItemDTO itemId;

}
