package com.anpetna.order.dto;

import com.anpetna.order.domain.OrderEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrdersDTO {

    private Long ordersId;

    private String memberId;

    private String cardId;

    private int totalPrice; // 총액

    private int itemQuantity;   // 총 수량


    // 서비스에서 매번 계산/매핑 코드를 반복하지 않도록, 정적 팩토리를 DTO에
    public static OrdersDTO from(com.anpetna.order.domain.OrdersEntity e) {
        int qty = (e.getOrderItems() == null) ? 0
                : e.getOrderItems().stream().mapToInt(com.anpetna.order.domain.OrderEntity::getQuantity).sum();

        return OrdersDTO.builder()
                .ordersId(e.getOrdersId())
                .memberId(e.getMemberId())
                .cardId(e.getCardId())
                .totalPrice(e.getTotalAmount())  // 이름 다르면 여기서 변환
                .itemQuantity(qty)
                .build();

    }

}
