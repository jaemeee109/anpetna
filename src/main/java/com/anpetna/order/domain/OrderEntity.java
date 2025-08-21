package com.anpetna.order.domain;

import com.anpetna.item.domain.ItemEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "anpetna_order_item")
@Data
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_id")
    private Long orderId;

    @ManyToOne
    @JoinColumn(name = "item_id", nullable = false)
    private ItemEntity itemEntity;

    @Column(name="order_price", nullable = false)
    private int price;

    @Column(name="order_quantity", nullable = false)
    private int quantity;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "orders_id", nullable = false)
    @ToString.Exclude
    private OrdersEntity orders;
}

