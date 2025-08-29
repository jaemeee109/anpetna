package com.anpetna.item.dto.registerItem;

import com.anpetna.core.coreDto.ImageListDTO;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@ToString
@Setter
@Getter
public class RegisterItemRes extends ImageListDTO {

    private Long itemId;

    private String itemName; // 상품명

    private int itemPrice;

    private String res;

    public RegisterItemRes registered(){
        this.res = "registered";
        return this;
    }
    //  UI(관리자페이지)
    //  "~~~" 상품이 등록되었습니다. → [상세 보기]...
}
