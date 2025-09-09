package com.anpetna.item.dto.searchOneItem;

import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.constant.ItemSellStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;


@Getter
@Setter
@NoArgsConstructor
@ToString
public class SearchOneItemRes {

    private Long itemId; // 상품코드

    private String itemName; // 상품명

    private int itemPrice; // 가격

    private int itemStock; // 재고수량

    private String itemDetail; // 상품 상세설명

    private ItemSellStatus itemSellStatus; // 상품 판매상태

    private ItemCategory itemCategory; // 상품 카테고리

    private String thumbnailUrl;

    private LocalDateTime createDate;

    private LocalDateTime latestDate;

    private List<String> imageUrls = new ArrayList<>();

}
