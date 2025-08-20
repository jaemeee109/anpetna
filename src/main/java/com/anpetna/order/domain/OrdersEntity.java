
package com.anpetna.order.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "anpetna_orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrdersEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "orders_id", nullable = false)
    private Long ordersId;

    @Column(name = "orders_memberId", nullable = false)
    private String memberId;

    @Column(name = "orders_cardId", nullable = false)
    private String cardId;

    @Column(name = "orders_totalAmount", nullable = false)
    private int totalAmount;

    /*@OneToMany(mappedBy = "ordersEntity", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderEntity> orderItems = new ArrayList<>();*/

    @Builder.Default
    @OneToMany(mappedBy = "orders", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderEntity> orderItems = new ArrayList<>();

    // 양방향 편의 메서드
    public void addOrderItem(OrderEntity item) {
        orderItems.add(item);
        item.setOrders(this);
    }

    public void removeOrderItem(OrderEntity item) {
        orderItems.remove(item);
        item.setOrders(null);
    }
}
