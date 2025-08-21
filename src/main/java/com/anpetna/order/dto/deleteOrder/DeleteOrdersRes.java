package com.anpetna.order.dto.deleteOrder;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeleteOrdersRes {

    private Long ordersId;
    private boolean deleted;       // true면 삭제 성공
    private int deletedItemCount;  // 삭제된 하위 OrderEntity 개수

}
