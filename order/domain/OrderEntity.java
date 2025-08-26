package com.anpetna.order.domain;

import com.anpetna.item.domain.ItemEntity;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;


// DB 테이블과 1:1로 매핑되는 "엔티티"
// 한 줄(레코드)이 "주문 내의 개별 품목(라인 아이템)"을 의미
@Entity                                // JPA에게 "이 클래스를 테이블과 매핑해!" 라고 알려줌
@Table(name = "anpetna_order_item")    // 실제 DB 테이블 이름 지정
@Data                                  // Lombok: getter/setter/toString/equals/hashCode 자동 생성
@Setter
@NoArgsConstructor                     // 기본 생성자 자동 생성 (JPA가 프록시 만들 때 필요)
@AllArgsConstructor                     // 모든 필드를 받는 생성자 자동 생성
@Builder
public class OrderEntity {

    @Id                                 // 이 필드가 PRIMARY KEY(고유키)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    // PK 값을 DB가 자동 증가(AUTO_INCREMENT) 방식으로 채워줌 (MariaDB/MySQL에서 흔히 쓰는 방식)
    @Column(name = "order_id")          // 실제 컬럼명: order_id
    private Long orderId;


     // 주문 품목은 "어떤 상품인지"를 알아야 하므로 상품 엔티티와 N:1 관계
     // (여러 주문 품목이 같은 상품을 가리킬 수 있음)
    @ManyToOne                          // 다대일(N:1) 관계
    @JoinColumn(name = "item_id", nullable = false)
    // 외래키(FK) 컬럼 이름을 item_id로 사용, NOT NULL 제약
    // 주의: @ManyToOne의 기본 fetch는 EAGER(즉시 로딩). 여기서는 명시를 생략했으므로 EAGER.
    private ItemEntity itemEntity;

    @Column(name="order_price", nullable = false)
    private int price; // 가격

    @Column(name="order_quantity", nullable = false)
    private int quantity; // 수량

    @Transient
    private String thumbnailUrl; // 썸네일용


     // 이 품목이 "어느 주문서(헤더)에 소속인지"를 나타내는 필드
     // 하나의 주문서(OrdersEntity)에 여러 개의 품목(OrderEntity)이 달립니다. => N:1
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    // LAZY: 이 필드는 실제로 필요할 때(접근할 때) DB에서 불러오도록 지연 로딩.
    // optional=false: 반드시 값이 있어야 함(NOT NULL)
    @JoinColumn(name = "orders_id", nullable = false) // FK 컬럼명: orders_id
    @ToString.Exclude
    // Lombok이 만드는 toString()에서 이 필드는 제외
    // (양방향 연관관계일 때 무한 순환(toString 호출이 계속됨) 또는 불필요한 로딩 방지를 위해)
    private OrdersEntity orders;


}
