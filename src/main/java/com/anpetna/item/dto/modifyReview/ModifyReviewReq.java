package com.anpetna.item.dto.modifyReview;

import com.anpetna.coreDomain.ImageEntity;
import com.anpetna.item.constant.ItemSaleStatus;
import com.anpetna.item.constant.ItemSellStatus;
import com.anpetna.item.dto.BaseReq;
import com.anpetna.item.dto.ItemDTO;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
public class ModifyReviewReq extends BaseReq {

    private Long reviewId;

    private String content;

    private ItemDTO itemId;

}
