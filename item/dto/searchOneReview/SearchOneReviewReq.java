package com.anpetna.item.dto.searchOneReview;

import com.anpetna.coreDomain.ImageEntity;
import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.constant.ItemSaleStatus;
import com.anpetna.item.constant.ItemSellStatus;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class SearchOneReviewReq {

    private Long reviewId; // 상품코드

}
