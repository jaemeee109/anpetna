package com.anpetna.item.dto.registerItem;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

@ToString
@Setter
@Getter
public class RegisterItemRes {

    private Long itemId;

    private String itemName; // 상품명

    private int itemPrice;

    private LocalDateTime createDate;

    private String res;

    public RegisterItemRes registered(){
        this.res = "registered";
        return this;
    }
    //  UI(관리자페이지)
    //  "~~~" 상품이 등록되었습니다. → [상세 보기]...
}
