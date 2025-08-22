package com.anpetna.item.dto.registerReview;

import com.anpetna.item.dto.BaseReq;
import lombok.Getter;
import lombok.ToString;

import java.time.LocalDateTime;

@ToString
@Getter
public class RegisterReviewReq extends BaseReq {

    private String content;

    private int rating;

    private LocalDateTime regDate;

    private String itemId;

}
