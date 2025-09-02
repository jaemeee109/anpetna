package com.anpetna.item.dto.deleteItem;

import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
public class DeleteItemRes {

    //  UI(관리자 페이지)
    //  관리자 상품 관리 화면에서 삭제 버튼 클릭 시
    //  삭제 성공 메시지 표시 후 리스트에서 즉시 제거
    //  "무선 이어폰" 상품이 삭제되었습니다.
    private Long itemId;
    private String itemName;              // 삭제된 상품명 (선택)
    private String res;            // "DELETED"

    public DeleteItemRes deleted(){
        this.res = "deleted";
        return this;
    }
}
