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

    /** 주문 헤더 + 품목 + 아이템까지 한번에 로딩 (쿼리문 X, fetch 전략만 지정) */
    @EntityGraph(attributePaths = { "orderItems", "orderItems.itemEntity" })
    Optional<OrdersEntity> findByOrdersId(Long ordersId);

    /** 회원별 주문 목록 페이지 (연관까지 로딩) */
    @EntityGraph(attributePaths = { "orderItems", "orderItems.itemEntity" })
    Page<OrdersEntity> findByMemberId(String memberId, Pageable pageable);

    /** 요약 DTO 계산 (리포지토리 default 메서드 — JPQL 없이 자바 코드로 합계 구함) */
    default Optional<OrdersDTO> findSummaryById(Long ordersId) {
        return findByOrdersId(ordersId).map(o -> {
            int totalQty = o.getOrderItems() == null ? 0 :
                    o.getOrderItems().stream()
                            .mapToInt(OrderEntity::getQuantity)
                            .sum();

            return OrdersDTO.builder()
                    .ordersId(o.getOrdersId())
                    .memberId(o.getMemberId())
                    .cardId(o.getCardId())
                    .totalPrice(o.getTotalAmount()) // 엔티티 totalAmount -> DTO totalPrice
                    .itemQuantity(totalQty)
                    .build();
        });
    }

}
