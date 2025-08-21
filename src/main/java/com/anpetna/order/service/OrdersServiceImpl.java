package com.anpetna.order.service;

import com.anpetna.order.domain.OrderEntity;
import com.anpetna.order.domain.OrdersEntity;
import com.anpetna.order.repository.OrderRepository;
import com.anpetna.order.repository.OrdersRepository;
import com.anpetna.order.dto.OrdersDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrdersServiceImpl implements OrdersService {

    private final OrdersRepository ordersRepository;
    private final OrderRepository orderRepository;

    @Override
    public OrdersDTO getDetail(Long ordersId) {
        if (ordersId == null) throw new IllegalArgumentException("ordersId must not be null");
        OrdersEntity e = ordersRepository.findByOrdersId(ordersId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다: " + ordersId));
        return toSummaryDTO(e);
    }

    @Override
    public OrdersDTO getSummary(Long ordersId) {
        if (ordersId == null) throw new IllegalArgumentException("ordersId must not be null");
        OrdersEntity e = ordersRepository.findByOrdersId(ordersId)
                .orElseThrow(() -> new IllegalArgumentException("주문 요약을 찾을 수 없습니다: " + ordersId));
        return toSummaryDTO(e);
    }

    @Override
    public Page<OrdersDTO> getSummariesByMember(String memberId, Pageable pageable) {
        if (memberId == null || memberId.isBlank()) throw new IllegalArgumentException("memberId must not be blank");
        if (pageable == null) throw new IllegalArgumentException("pageable must not be null");
        return ordersRepository.findByMemberId(memberId, pageable).map(this::toSummaryDTO);
    }

    @Override
    @Transactional
    public void delete(Long ordersId) {
        if (ordersId == null) throw new IllegalArgumentException("ordersId must not be null");
        // 하위 품목 먼저 삭제 후 헤더 삭제
        orderRepository.deleteByOrders_OrdersId(ordersId);
        ordersRepository.deleteById(ordersId);
    }


    /* =========================
       내부 매핑: Entity -> OrdersDTO
       ========================= */
    // private OrdersDTO toSummaryDTO(OrdersEntity i) {
    //        return OrdersDTO.builder()
    //                .ordersId(i.getOrdersId())
    //                .memberId(i.getMemberId())
    //                .cardId(i.getCardId())
    //                .totalPrice(i.getTotalAmount())
    //                .itemQuantity(
    //                        (i.getOrderItems() == null) ? 0
    //                                : i.getOrderItems().stream()
    //                                .mapToInt(OrderEntity::getQuantity)
    //                                .sum()
    //                )
    //                .build();
    //    } 아래 내용으로 수정

    private OrdersDTO toSummaryDTO(OrdersEntity orders) {
        int totalQty = (orders.getOrderItems() == null) ? 0
                : orders.getOrderItems().stream().mapToInt(OrderEntity::getQuantity).sum();

        int totalPrice = (orders.getOrderItems() == null) ? 0
                : orders.getOrderItems().stream()
                .mapToInt(oi -> oi.getPrice() * oi.getQuantity())
                .sum();

        return OrdersDTO.builder()
                .ordersId(orders.getOrdersId())
                .memberId(orders.getMemberId())
                .cardId(orders.getCardId())
                .totalPrice(totalPrice)
                .itemQuantity(totalQty)
                .build();
    }
}