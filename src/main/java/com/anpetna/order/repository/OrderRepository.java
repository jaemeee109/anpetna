package com.anpetna.order.repository;

import com.anpetna.order.domain.OrderEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, Long> {

    List<OrderEntity> findByOrders_OrdersId(Long ordersId);

    // before: void
    long deleteByOrders_OrdersId(Long ordersId);
}
