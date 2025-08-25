package com.anpetna.order.dto.deleteOrder;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeleteOrderItemReq {

    @NotNull
    private Long ordersId;

    @NotNull
    private Long orderItemId;

}
