package com.anpetna.order.dto.readOneOrderDTO;

<<<<<<< HEAD
=======
import com.anpetna.member.domain.MemberEntity;
>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
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

<<<<<<< HEAD
    private String memberId;    // 주문자 ID
=======
    private MemberEntity memberId;    // 주문자 ID
>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")

    private String cardId;   // 카드 ID

    private int shippingFee;   // 배송비

    private int itemsSubtotal;   // 아이템 합계(배송비 제외)

    private int totalAmount;    // 최종 결제 금액 (= itemsSubtotal + shippingFee)

    private OrdersStatus status;    // 주문 상태

    private AddressDTO shippingAddress;  // 배송지 전체 포함

    private String thumbnailUrl;    // 섬네일 이미지 URL

    private List<OrderDTO> ordersItems; // List로 Order 담기

}