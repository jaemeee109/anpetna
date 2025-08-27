package com.anpetna.order.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;


 // "주문서(헤더)"를 담는 엔티티
 // 한 건의 주문(영수증 상단 정보) = OrdersEntity 1행
@Entity
@Table(name = "anpetna_orders")
@Data
@Getter
@NoArgsConstructor // 기본 생성자
@AllArgsConstructor // 모든 필드 받는 생성자
@Builder
public class OrdersEntity {

    @Id // PK(기본키)
    @GeneratedValue(strategy = GenerationType.IDENTITY) // DB의 AUTO_INCREMENT를 이용해 PK를 생성
    @Column(name = "orders_id", nullable = false) // 실제 컬럼명과 제약
    private Long ordersId;

    @Column(name = "orders_memberId", nullable = false) // 주문한 회원 식별자(문자열)
    private String memberId;

    @Column(name = "orders_cardId", nullable = false) // 결제 카드 식별자(문자열)
    private String cardId;

    @Column(name = "orders_totalAmount", nullable = false) // 주문 총 금액(헤더 수준 합계)
    private int totalAmount;

    @Column(name = "orders_itemImageUrl", nullable = false)
    private String itemImageUrl;    // 대표이미지 URL

     @Column(name = "order_itemImageName", nullable = false)
     private String itemImageName;   // 파일명


     @Builder.Default // 빌더 사용 시에도 빈 리스트로 기본값 세팅 (null 방지)
    @ToString.Exclude // Lombok toString()에서 제외 → 순환참조/과도한 출력 방지
    @OneToMany(
            mappedBy = "orders",              // 반대편(OrderEntity)에서 이 엔티티를 가리키는 필드명
            cascade = CascadeType.ALL,        // 부모(주문서) 저장/삭제 시 자식(품목)도 함께 전파
            orphanRemoval = true              // 부모 컬렉션에서 제거된 자식은 고아 객체로 간주 → DB에서도 삭제
    )
    private List<OrderEntity> orderItems = new ArrayList<>();

    // 양방향 편의 메서드
    public void addOrderItem(OrderEntity item) {
        // 메모리상의 컬렉션에 자식 추가
        orderItems.add(item);
        // 반대편(자식) 연관관계도 함께 맞춰줌 → 둘 다 세팅해야 JPA가 안정적으로 동작
        item.setOrders(this);
        // 주의: 가격/수량으로 totalAmount를 계산해 반영하고 싶다면
        // 별도의 합계 갱신 로직을 여기에 추가하는 방식도 가능
    }

    public void removeOrderItem(OrderEntity item) {
        // 컬렉션에서 제거
        orderItems.remove(item);
        // 자식 쪽 연관관계 끊기
        item.setOrders(null);
        // orphanRemoval=true 이므로, 영속성 컨텍스트 flush 시 DB에서도 해당 품목(row) 삭제
    }
}