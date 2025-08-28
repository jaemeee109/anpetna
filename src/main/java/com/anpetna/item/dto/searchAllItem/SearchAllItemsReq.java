package com.anpetna.item.dto.searchAllItem;

import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.constant.ItemSellStatus;
import lombok.Builder;
import lombok.Getter;
import org.hibernate.query.SortDirection;
import org.springframework.data.domain.Sort;

import java.time.LocalDate;

@Builder
@Getter
public class SearchAllItemsReq {

    //  정렬용 필드
    private ItemCategory sortByCategory; // 상품 카테고리

    //  ============================
    private LocalDate createDate;

    private Sort.Direction orderByDate; // 최신순 / 오래된 순

    private ItemSellStatus saleStatus; // 상품 판매상태

    private Sort.Direction orderByPriceDir; // 가격순


    //  Pagenation
    @Builder.Default
    private int page = 0;   // 페이지 번호

    @Builder.Default
    private int size = 20;  // 페이지 크기

    @Builder.Default
    private Sort.Direction sort = Sort.Direction.DESC; // 페이지 정렬

}