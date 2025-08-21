package com.anpetna.order.dto.registerOrder;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterOrdersReq {

    @NotBlank
    private String memberId;

    @NotBlank
    private String cardId;

    @Builder.Default
    @NotEmpty  // 최소 1개 품목
    private List<Item> items = new ArrayList<>();

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Item {
        @NotNull
        private Long itemId;

        // price는 서버에서 아이템 기준가로 재계산 권장.
        // 클라이언트가 보낸 값을 확인만 할 거면 @Positive 붙이고, 아니라면 아예 제거
        @Positive
        private int price;

        @Positive
        private int quantity;
    }

}
