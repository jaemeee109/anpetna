package com.anpetna.order.dto.createOrderDTO;

import com.anpetna.member.domain.MemberEntity;
import com.anpetna.order.dto.AddressDTO;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateOrderReq {

    // =====================================
    public enum Mode { ITEM, CART }

    @NotNull
    private Mode mode;

    // ITEM 모드
    private Long itemId;
    private Integer quantity;

    // CART 모드 (선택한 itemId 목록)
    private List<Long> itemIds;

    // =====================================

    // 배송지 선택 방식
    @NotBlank
    private String memberId;

    @NotBlank
    private String cardId;

    // 배송지 선택 방식
    private boolean useSavedAddress;     // true면 저장된 기본 배송지 사용

    @Valid
    private AddressDTO shippingAddress;  // 직접 입력일 때 채움

    @NotNull
    @Size(min = 1)
    @Valid
    private List<Line> items;            // 주문 품목 목록

    @Min(0)
    private Integer shippingFee;         // null 허용 → 안 보내면 기본값 사용

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Line {

        @NotNull Long itemId;
        @Min(1) int quantity;

    }

}
