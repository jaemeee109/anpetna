package com.anpetna.order.dto.readOneOrderDTO;

import com.anpetna.member.domain.MemberEntity;
import com.anpetna.order.constant.OrdersStatus;
import com.anpetna.order.dto.AddressDTO;
import com.anpetna.order.dto.OrderDTO;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ReadOneOrdersRes {

    private Long ordersId;  // 주문서 ID

    private String memberId;    // 주문자 ID

    private String cardId;   // 카드 ID

    private int shippingFee;   // 배송비

    private int itemsSubtotal;   // 아이템 합계(배송비 제외)

    private int totalAmount;    // 최종 결제 금액 (= itemsSubtotal + shippingFee)

    private OrdersStatus status;    // 주문 상태

    private AddressDTO shippingAddress;  // 배송지 전체 포함

    private String thumbnailUrl;    // 섬네일 이미지 URL

    private List<OrderDTO> ordersItems; // List로 Order 담기

}