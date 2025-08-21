package com.anpetna.order.dto.deleteOrder;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeleteOrderItemRes {

    private Long ordersId;
    private Long orderItemId;
    private boolean deleted;
    private String message;

}
