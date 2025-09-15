package com.anpetna.order.domain;

import com.anpetna.item.domain.ItemEntity;
import jakarta.persistence.*;
import lombok.*;


// DB 테이블과 1:1로 매핑되는 "엔티티"
// 한 줄(레코드)이 "주문 내의 개별 품목(라인 아이템)"을 의미
@Entity                                // JPA에게 "이 클래스를 테이블과 매핑해!" 라고 알려줌
@Table(name = "anpetna_order_item")    // 실제 DB 테이블 이름 지정
@Setter
@Getter
@ToString
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_id")
    private Long orderId;

     // 주문 품목은 "어떤 상품인지"를 알아야 하므로 상품 엔티티와 N:1 관계
     // (여러 주문 품목이 같은 상품을 가리킬 수 있음)
    @ManyToOne(fetch = FetchType.LAZY)   // 다대일(N:1) 관계
    @JoinColumn(name = "item_id", nullable = false)
    private ItemEntity item;

    @Column(name="order_price", nullable = false)
    private int price; // 가격 ( 수량 * 상품가격 * 할인 )

    @Column(name="order_quantity", nullable = false)
    private int quantity; // 수량

    @Transient
    private String thumbnailUrl; // 썸네일용

     // 이 품목이 "어느 주문서(헤더)에 소속인지"를 나타내는 필드
     // 하나의 주문서(OrdersEntity)에 여러 개의 품목(OrderEntity)이 달림 => N:1
    @ManyToOne(fetch = FetchType.LAZY, optional = false)     // optional=false: 반드시 값이 있어야 함(NOT NULL)
    @JoinColumn(name = "orders_id", nullable = false)
    private OrdersEntity orders;
    // 이 품목이 어떤 주문서에 속하는지 외래키 설정


}
