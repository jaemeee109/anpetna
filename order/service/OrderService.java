//package com.anpetna.order.service;
//
//import com.anpetna.order.domain.OrderEntity;
//import org.springframework.data.domain.Page;
//import org.springframework.data.domain.Pageable;
//
//import java.util.List;
//
//public interface OrderService {
//
//    // 특정 주문서의 라인들 페이징 조회
//    Page<OrderEntity> getByOrdersId(Long ordersId, Pageable pageable);
//
//    // 특정 주문서의 라인들 전체 조회
//    List<OrderEntity> getByOrdersId(Long ordersId);
//
//    // 특정 주문서의 총 수량(모든 라인 quantity 합)
//    int getTotalQuantity(Long ordersId);
//
//    // 특정 주문서의 총 금액(∑ price * quantity)
//    int getTotalAmount(Long ordersId);
//
//
//}
