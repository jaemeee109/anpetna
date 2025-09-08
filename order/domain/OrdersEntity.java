package com.anpetna.order.domain;

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

    @Column(name = "orders_itemImageUrl", nullable = false) // 대표이미지 URL
    private String itemImageUrl;

     @Column(name = "order_itemImageName", nullable = false) // 파일명
     private String itemImageName;

     @Builder.Default // 빌더 사용 시에도 빈 리스트로 기본값 세팅 (null 방지)
     @ToString.Exclude // Lombok toString()에서 제외 → 순환참조/과도한 출력 방지
     @OneToMany(
            mappedBy = "orders",              // 반대편(OrderEntity)에서 이 엔티티를 가리키는 필드명
            cascade = CascadeType.ALL        // 부모(주문서) 저장/삭제 시 자식(품목)도 함께 전파
     )

     private List<OrderEntity> orderItems = new ArrayList<>();


}