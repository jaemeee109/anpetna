package com.anpetna.item.dto.registerReview;

import com.anpetna.coreDto.ImageListDTO;
import lombok.Getter;
import lombok.ToString;

import java.time.LocalDateTime;

@ToString
@Getter
public class RegisterReviewReq extends ImageListDTO {

    private String content;

    private int rating;

    private LocalDateTime regDate;

    private String itemId;

}
