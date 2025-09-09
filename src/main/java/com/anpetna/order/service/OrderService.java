package com.anpetna.order.service;

import com.anpetna.order.domain.OrderEntity;

import java.util.List;

public interface OrderService {

    // 특정 주문에 속한 모든 품목 조회
    List<OrderEntity> getByOrdersId(Long ordersId);

    // 특정 주문에 속한 주문 내역 전체 삭제
    long deleteAllOrdersId(Long ordersId);

    // 특정 주문에서 특정 품목만 제외
    void removeOrderItem(Long ordersId, Long orderItemId);

}
