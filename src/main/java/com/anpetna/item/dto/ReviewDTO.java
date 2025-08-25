package com.anpetna.item.dto;

import com.anpetna.coreDto.ImageDTO;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class ReviewDTO {

    private Long reviewId;

    private String content;

    private int rating;

    private LocalDateTime regDate;

    private ItemDTO itemId;

    private List<ImageDTO> images = new ArrayList<>();

}
