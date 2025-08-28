package com.anpetna.item.dto.modifyReview;

import com.anpetna.item.dto.ItemDTO;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class ModifyReviewRes {

    private Long reviewId;

    private LocalDateTime modDate;

    private ItemDTO itemId;

    private String res;

    public ModifyReviewRes modified(){
        this.res = "modified";
        return this;
    }
}
