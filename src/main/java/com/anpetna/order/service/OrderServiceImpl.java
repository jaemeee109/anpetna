package com.anpetna.order.service;

import com.anpetna.order.domain.OrderEntity;
import com.anpetna.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;



@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;

    @Override
    public List<OrderEntity> getByOrdersId(Long ordersId) {
        if (ordersId == null) throw new IllegalArgumentException("ordersId must not be null");
        return orderRepository.findByOrders_OrdersId(ordersId);
    }

    @Override
    @Transactional
    public void deleteByOrdersId(Long ordersId) {
        if (ordersId == null) throw new IllegalArgumentException("ordersId must not be null");
        orderRepository.deleteByOrders_OrdersId(ordersId);
    }
}
