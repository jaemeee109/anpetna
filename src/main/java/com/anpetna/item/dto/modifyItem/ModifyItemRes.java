package com.anpetna.item.dto.modifyItem;

import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.constant.ItemSellStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

@ToString
@Setter
@Getter
public class ModifyItemRes {

    //  UI(관리자 페이지)
    //  성공 알림 표시
    //  상품 리스트 화면 자동 갱신

    private Long itemId;
    private String itemName;          // 수정된 상품명
    private int itemPrice;        // 수정된 가격
    private int itemStock;        // 수정된 재고
    private String itemDetail; // 상품 상세설명
    private ItemSellStatus itemSellStatus; // 상품 판매상태
    private ItemCategory itemCategory; // 상품 카테고리
    private LocalDateTime latestDate;

    private String res;        // "UPDATED"

    public ModifyItemRes modified(){
        this.res = "modified";
        return this;
    }
}
