package com.anpetna.order.dto.readAllOrderDTO;

import com.anpetna.member.domain.MemberEntity;
import com.anpetna.order.constant.OrdersStatus;
import com.anpetna.order.dto.AddressDTO;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ReadAllOrdersRes {

    private long totalElements;   // 전체 건수

    private int totalPages;       // 전체 페이지 수

    private int pageNumber;       // 현재 페이지 번호

    private int pageSize;         // 페이지 크기

    private List<Line> content;    // 주문 요약 목록

    @Getter
    @Builder
    public static class Line {

        private Long ordersId;        // 주문 ID

        private String memberId;      // 회원 ID

        private int itemQuantity;     // 주문 총 수량

        private int itemsSubtotal;   // 아이템 합계(배송비 제외)

        private int shippingFee;     // 배송비

        private int totalAmount;      // 결제 총액(소계+배송비)

        private OrdersStatus status;          // 주문 상태

        private String thumbnailUrl;  // 대표 썸네일 (주문 헤더용)
    }



}
