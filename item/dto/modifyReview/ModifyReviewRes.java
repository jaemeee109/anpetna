package com.anpetna.item.dto.modifyReview;

import com.anpetna.coreDomain.ImageEntity;
import com.anpetna.item.constant.ItemSaleStatus;
import com.anpetna.item.constant.ItemSellStatus;
import com.anpetna.item.dto.ItemDTO;
import com.anpetna.item.dto.registerReview.RegisterReviewRes;
import lombok.Getter;

@Getter
public class ModifyReviewRes {

    private Long reviewId;

    private LocalDateTime latestDate;

    private String res;

    public ModifyReviewRes modified(){
        this.res = "modified";
        return this;
    }
}
