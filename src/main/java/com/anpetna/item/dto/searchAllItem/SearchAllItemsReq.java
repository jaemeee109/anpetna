package com.anpetna.item.dto.searchAllItem;

import com.anpetna.item.constant.ItemCategory;
import lombok.Builder;
import lombok.Getter;
import org.springframework.data.domain.Sort;

@Builder
@Getter
public class SearchAllItemsReq {

    //  정렬용 필드
    @Builder.Default
    private ItemCategory itemCategory = ItemCategory.ALL; // 상품 카테고리
    // 상품 판매상태 (판매중은 앞에, 품절은 뒤에)

    //  정렬 옵션 (DESC, ASC)
    private Sort.Direction orderByDate; // 최신순 / 오래된 순
    private Sort.Direction orderByPrice; // 가격 높은 순 /가격 낮은 순
    private Sort.Direction orderBySales; // 판매량 높은 순 / 판매량 낮은 순

    //  Pagenation
    @Builder.Default
    private int page = 0;   // 페이지 번호

    @Builder.Default
    private int size = 20;  // 페이지 크기

}
