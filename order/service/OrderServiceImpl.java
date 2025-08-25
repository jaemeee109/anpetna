package com.anpetna.order.service;

import com.anpetna.order.domain.OrderEntity;
import com.anpetna.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service // 스프링이 서비스(비즈니스 로직) 빈으로 등록해 줌
@RequiredArgsConstructor // final 필드를 파라미터로 받는 생성자를 롬복이 자동 생성 (DI용)
@Transactional(readOnly = true)
// 이 클래스의 메서드들은 기본적으로 "읽기 전용 트랜잭션"으로 실행됨
// 쓰기(등록/수정/삭제)가 필요한 메서드는 아래처럼 메서드에 @Transactional을 다시 붙여 readOnly를 해제함
public class OrderServiceImpl implements OrderService {

    // 주문의 개별 품목(행)을 처리하는 JPA 리포지토리
    private final OrderRepository orderRepository;

    @Override
    public List<OrderEntity> getByOrdersId(Long ordersId) {

        if (ordersId == null) throw new IllegalArgumentException("ordersId는 비워둘 수 없습니다.");
        // 필수 값이 없을 때 즉시 예외를 던지는 방어 코드

        return orderRepository.findByOrders_OrdersId(ordersId);
        //                     findByOrders_OrdersId : 자식(OrderEntity)에서 부모(OrdersEntity)의 PK(ordersId)를 통해 검색


    }

    @Override
    @Transactional
    public long deleteAllOrdersId(Long ordersId) {  // 전체 삭제

        if(ordersId == null) throw new IllegalArgumentException("ordersId는 비워둘 수 없습니다.");
        // 잘못된 입력에 대한 방어 로직

        return orderRepository.deleteByOrders_OrdersId(ordersId);
        // 삭제된 행 수를 리턴.
    }

    @Override
    @Transactional
    public void removeOrderItem(Long ordersId, Long orderItemId) {  // 한 개만 삭제

        // 방어 로직
        if(ordersId == null) throw new IllegalArgumentException("ordersId는 비워둘 수 없습니다.");
        if(orderItemId == null) throw new IllegalArgumentException("ordersItemId는 비워둘 수 없습니다.");

        // 삭제하려는 물품 한 건 로드(없으면 예외)
        OrderEntity item = orderRepository.findById(orderItemId)
                .orElseThrow(() -> new IllegalArgumentException("해당 품목을 찾을 수 없습니다 : " + orderItemId));

        // 이 품목이 정말 전달받은 주문(ordersId)에 속해있는지 확인
        if (!ordersId.equals(item.getOrders().getOrdersId())) {

            throw new IllegalArgumentException("품목이 주문(" + ordersId + ")에 속해있지 않습니다.");

        }

        // 편의 메서드 사용 (OrdersEntity)
        item.getOrders().removeOrderItem(item);

    }


}