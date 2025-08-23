package com.anpetna.item.dto;

import com.anpetna.coreDto.ImageListDTO;
import java.time.LocalDateTime;

public class ReviewDTO extends ImageListDTO {

    private Long reviewId;

    private String content;

    private int rating;

    private LocalDateTime regDate;

    private ItemDTO itemId;

}
