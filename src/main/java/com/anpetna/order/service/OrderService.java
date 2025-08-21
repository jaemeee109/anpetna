package com.anpetna.order.service;

import com.anpetna.order.domain.OrderEntity;

import java.util.List;

public interface OrderService {

    List<OrderEntity> getByOrdersId(Long ordersId);

    void deleteByOrdersId(Long ordersId);

}
