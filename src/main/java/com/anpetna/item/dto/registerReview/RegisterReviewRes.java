package com.anpetna.item.dto.registerReview;

import com.anpetna.coreDto.ImageDTO;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class RegisterReviewRes {

    private Long reviewId;

    private LocalDateTime regDate;

    private String itemId;

    private String res;

    public RegisterReviewRes registered(){
        this.res = "registered";
        return this;
    }

}
