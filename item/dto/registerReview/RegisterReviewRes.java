package com.anpetna.item.dto.registerReview;

import com.anpetna.coreDto.ImageDTO;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@ToString
public class RegisterReviewRes {

    private Long reviewId;

    private LocalDateTime createDate;

    private String res;

    public RegisterReviewRes registered(){
        this.res = "registered";
        return this;
    }
    //--일 --시 --분 리뷰 등록이 완료되었습니다.
}
