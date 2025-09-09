package com.anpetna.item.dto.registerReview;

import java.time.LocalDateTime;

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
