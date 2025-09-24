package com.anpetna.order.domain;

import com.anpetna.core.coreDomain.BaseEntity;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.order.constant.OrdersStatus;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

// "주문서(헤더)"를 담는 엔티티
// 한 건의 주문(영수증 상단 정보) = OrdersEntity 1행
@Entity
@Table(name = "anpetna_orders")
@Setter
@Getter
@ToString
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrdersEntity extends BaseEntity {

    @Id // PK(기본키)
    @GeneratedValue(strategy = GenerationType.IDENTITY) // DB의 AUTO_INCREMENT를 이용해 PK를 생성
    @Column(name = "orders_id", nullable = false) // 실제 컬럼명과 제약
    private Long ordersId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "orders_memberId", nullable = false)
    @ToString.Exclude // LAZY 연관관계 출력 시 순환/지연로딩 이슈 방지
    private MemberEntity memberId;

    @Column(name = "orders_cardId", nullable = false) // 결제 카드 식별자(문자열)
    private String cardId;

    @Column(name = "orders_itemQuantity", nullable = false) // 총 수량
    private int itemQuantity;

    @Column(name = "orders_totalAmount", nullable = false) // 물건값(= 물건값 + 배송비) -> 최종 결제액
    private int totalAmount;

    @Column(name = "orders_shippingFee", nullable = false) // 배송비(기본 0)
    private int shippingFee;

    @Embedded
    @AttributeOverrides({
            // 배송지
            @AttributeOverride(name = "zipcode",  column = @Column(name = "orders_zipcode")),
            @AttributeOverride(name = "street",   column = @Column(name = "orders_street")),
            @AttributeOverride(name = "detail",   column = @Column(name = "orders_detail")),
            @AttributeOverride(name = "receiver", column = @Column(name = "orders_receiver")),
            @AttributeOverride(name = "phone",    column = @Column(name = "orders_receiver_phone"))
    })
    private AddressEntity shippingAddress;   // 배송지

    @Enumerated(EnumType.STRING)
    @Column(name = "orders_status", nullable = false, length = 20)
    private OrdersStatus status;

    @Column(name = "orders_thumb", nullable = false)
    private String ordersThumbnail;

    @Builder.Default // 빌더 사용 시에도 빈 리스트로 기본값 세팅 (null 방지)
    @ToString.Exclude // Lombok toString()에서 제외 → 순환참조/과도한 출력 방지
    @OneToMany(
            mappedBy = "orders",              // 반대편(OrderEntity)에서 이 엔티티를 가리키는 필드명
            cascade = {CascadeType.PERSIST, CascadeType.MERGE}
    )
    private List<OrderEntity> orderItems = new ArrayList<>(); // null 방지용. 주문에 품목이 없어도 항상 빈 리스트 상태.
}
