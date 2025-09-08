package com.anpetna.order.dto.readAllOrderDTO;

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

        private int totalAmount;      // 주문 총액

        private int itemQuantity;     // 주문 총 수량

        private String thumbnailUrl;  // 대표 썸네일 (주문 헤더용)
    }

}
