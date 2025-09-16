package com.anpetna.order.dto;

import com.anpetna.member.domain.MemberEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrdersDTO {

    private Long ordersId;      // 주문 ID

    private MemberEntity member;    // 주문자 ID

    private String cardId;      // 카드정보 ID



}
