package com.anpetna.order.repository;

import com.anpetna.order.domain.OrderEntity;
import com.anpetna.order.domain.OrdersEntity;
import com.anpetna.order.dto.OrdersDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrdersRepository extends JpaRepository<OrdersEntity, Long> {



    // 주문 헤더 + 품목 + 아이템까지 한번에 로딩
    @EntityGraph(attributePaths = { "orderItems", "orderItems.itemEntity" })
    // @EntityGraph: 연관된 컬렉션/엔티티를 즉시 함께 가져오도록 지시(N+1 문제 완화).
    // attributePaths 경로 문법:
    //   - "orderItems"                : OrdersEntity.orderItems 컬렉션
    //   - "orderItems.itemEntity"     : 각 주문 품목(OrderEntity)이 가리키는 상품(ItemEntity)
    // 결과적으로 orders 한 건을 조회할 때, 그 안의 품목들과 품목이 가리키는 아이템까지 한 번에 가져옵니다.
    // 반환 타입 Optional: 결과가 없을 수도 있으니 null 대신 Optional로 받습니다.
    Optional<OrdersEntity> findByOrdersId(Long ordersId);

    // 회원별 주문 목록 페이지 (연관까지 로딩)
    @EntityGraph(attributePaths = { "orderItems", "orderItems.itemEntity" })
    //                               orderItems : OrdersEntity.orderItems 컬렉션
    //                                             orderItems.itemEntity : 각 주문 품목(OrderEntity)이 가리키는 상품 (ItemEntity)
    // 결과적으로 orders 한 건을 조회할 때, 그 안의 품목들과 품목이 가리키는 아이템까지 한 번에 가져옴
    Page<OrdersEntity> findByMemberId(String memberId, Pageable pageable);
    // Page<OrderEntity> : 한 번에 전부가 아닌 한 페이지 분량만 가져옴
    // pageable : 페이지 번호, 크기, 정렬 정보를 담은 파라미터 (컨트롤러나 서비스에서 주입)

    // 요약 DTO 계산 (리포지토리 default 메서드 — JPQL 없이 자바 코드로 합계 구함)
    default Optional<OrdersDTO> findSummaryById(Long ordersId) {
        return findByOrdersId(ordersId).map(o -> {
            // 총 수량 계산 : orderItems가 null이면 0, 아니면 각 품목의 quantity를 모두 합산
            int totalQty = o.getOrderItems() == null ? 0 :
                    o.getOrderItems().stream()
                            .mapToInt(OrderEntity::getQuantity)
                            .sum();

            return OrdersDTO.builder()
                    .ordersId(o.getOrdersId())
                    .memberId(o.getMemberId())
                    .cardId(o.getCardId())
                    .totalPrice(o.getTotalAmount())
                    .itemQuantity(totalQty)
                    .build();
        });
    }

    // 사용 팁:
    // - 상세 화면: findByOrdersId(ordersId) 로딩 → 품목/아이템까지 한 번에 사용 가능
    // - 목록 화면: findByMemberId(memberId, pageable) → 페이징 + 연관 로딩
    // - 요약 필요: findSummaryById(ordersId) → DTO로 바로 전달 (서비스/컨트롤러가 가벼워짐)


}
