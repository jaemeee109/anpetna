package com.anpetna.order.dto.readOneOrderDTO;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReadOneOrdersReq {

    @NotNull
    @Min(1)
    Long ordersId;

    @NotNull
    String memberId;
    // 토큰 사용자와 일치 확인 용도


}
