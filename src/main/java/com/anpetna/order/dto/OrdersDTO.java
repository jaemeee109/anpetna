package com.anpetna.order.dto;

import com.anpetna.order.domain.OrderEntity;
import com.anpetna.order.domain.OrdersEntity;
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

    private Long ordersId;      // 주문 ID

    private String memberId;    // 주문자 ID

    private String cardId;      // 카드정보 ID

    private int totalPrice;     // 총액

    private int itemQuantity;   // 총 수량


    // 정적 팩토리 메서드 : 엔티티 → DTO 변환을 한 곳에서 처리
    // 서비스&컨트롤러에서 매번 같은 매핑 코드를 반복하지 않기 위함
    // 사용법 : OrdersDTO dto = OrdersDTo.from(ordersEntity)
    public static OrdersDTO from(OrdersEntity e) {

        // 총 수량 계산
        int qty = (e.getOrderItems() == null) ? 0
                // e.getOrderItems()가 null일 경우 보호 코드(0처리)
                : e.getOrderItems()
                .stream()
                .mapToInt(OrderEntity::getQuantity)
                .sum();

        // 엔티티의 값을 DTO에 담아서 반환
        return OrdersDTO.builder()
                .ordersId(e.getOrdersId())
                .memberId(e.getMemberId())
                .cardId(e.getCardId())
                .totalPrice(e.getTotalAmount())
                .itemQuantity(qty)
                .build();

    }

}
