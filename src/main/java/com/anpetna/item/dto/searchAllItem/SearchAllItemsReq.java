package com.anpetna.item.dto.searchAllItem;

import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.constant.ItemSellStatus;
import groovyjarjarantlr4.v4.runtime.misc.NotNull;
import lombok.Builder;
import lombok.Getter;
import org.hibernate.query.SortDirection;
import org.springframework.data.domain.Sort;

import java.time.LocalDate;
import org.springframework.data.domain.Sort;

import java.time.LocalDate;

@Builder
@Getter
public class SearchAllItemsReq {

    //  정렬용 필드
    @Builder.Default
    private ItemCategory itemCategory = ItemCategory.ALL; // 상품 카테고리
    // 상품 판매상태 (판매중은 앞에, 품절은 뒤에)

    //  정렬 옵셩
    private Sort.Direction orderByDate; // 최신순 / 오래된 순
    private Sort.Direction orderByPrice; // 가격순


    //  Pagenation
    @Builder.Default
    private int page = 0;   // 페이지 번호

    @Builder.Default
    private int size = 20;  // 페이지 크기

}