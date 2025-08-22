package com.anpetna.item.dto.deleteReview;

import com.anpetna.item.dto.deleteItem.DeleteItemRes;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DeleteReviewRes {

    private Long reviewId;

    private String res;            // "DELETED"

    public DeleteReviewRes deleted(){
        this.res = "deleted";
        return this;
    }
}
