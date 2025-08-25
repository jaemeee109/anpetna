package com.anpetna.order.service;

import com.anpetna.order.domain.OrderEntity;
import com.anpetna.order.domain.OrdersEntity;
import com.anpetna.order.dto.OrdersDTO;
import com.anpetna.order.repository.OrderRepository;
import com.anpetna.order.repository.OrdersRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class OrdersServiceImpl implements OrdersService {

    private final OrdersRepository ordersRepository;
    private final OrderRepository orderRepository;

    public OrdersServiceImpl(OrdersRepository ordersRepository, OrderRepository orderRepository) {
        this.ordersRepository = ordersRepository;
        this.orderRepository = orderRepository;
    }

    @Override
    public OrdersDTO getDetail(Long ordersId) {
        var i = ordersRepository.findByOrdersId(ordersId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다: " + ordersId));
        return toSummaryDTO(i);
    }

    @Override
    public OrdersDTO getSummary(Long ordersId) {
        var i = ordersRepository.findByOrdersId(ordersId)
                .orElseThrow(() -> new IllegalArgumentException("주문 요약을 찾을 수 없습니다: " + ordersId));
        return toSummaryDTO(i);
    }

    @Override
    public Page<OrdersDTO> getSummariesByMember(String memberId, Pageable pageable) {
        return ordersRepository.findByMemberId(memberId, pageable)
                .map(this::toSummaryDTO);
    }

    @Override
    @Transactional
    public void delete(Long ordersId) {
        // 하위 품목 먼저 삭제 후 헤더 삭제
        orderRepository.deleteByOrders_OrdersId(ordersId);
        ordersRepository.deleteById(ordersId);
    }

    /* =========================
       내부 매핑: Entity -> OrdersDTO
       ========================= */
    private OrdersDTO toSummaryDTO(OrdersEntity i) {
        return OrdersDTO.builder()
                .ordersId(i.getOrdersId())
                .memberId(i.getMemberId())
                .cardId(i.getCardId())
                .totalPrice(i.getTotalAmount())
                .itemQuantity(
                        (i.getOrderItems() == null) ? 0
                                : i.getOrderItems().stream()
                                .mapToInt(OrderEntity::getQuantity)
                                .sum()
                )
                .build();
    }
}
