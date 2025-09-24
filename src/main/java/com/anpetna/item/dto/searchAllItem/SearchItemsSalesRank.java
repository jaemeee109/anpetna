package com.anpetna.item.dto.searchAllItem;

import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.constant.ItemRankingPeriod;
import com.fasterxml.jackson.annotation.JsonAnyGetter;
import lombok.Builder;
import lombok.Getter;
import org.springframework.data.domain.Sort;

@Builder
@Getter
public class SearchItemsSalesRank {

    //  정렬용 필드
    @Builder.Default
    private ItemCategory itemCategory = ItemCategory.ALL; // 상품 카테고리
    // 상품 판매상태 (판매중은 앞에, 품절은 뒤에)

    private Sort.Direction orderBySales; // 판매량 높은 순 / 판매량 낮은 순
    private ItemRankingPeriod period; //주기

    //  Pagination
    @Builder.Default
    private int page = 0;   // 페이지 번호

    @Builder.Default
    private int size = 20;  // 페이지 크기

}
