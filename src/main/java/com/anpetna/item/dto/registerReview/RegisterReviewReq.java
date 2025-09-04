package com.anpetna.item.dto.registerReview;

import com.anpetna.image.dto.ImageListDTO;
import lombok.Builder;
import lombok.Getter;
import lombok.ToString;

import java.time.LocalDateTime;

@ToString
@Getter
@Builder
public class RegisterReviewReq extends ImageListDTO {

    private String content;

    private int rating;

    private LocalDateTime regDate;

    private Long itemId;

}
