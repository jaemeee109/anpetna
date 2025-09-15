package com.anpetna.order.repository;

import com.anpetna.member.domain.MemberEntity;
import com.anpetna.order.constant.OrdersStatus;
import com.anpetna.order.domain.OrdersEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrdersRepository extends JpaRepository<OrdersEntity, Long> {

    // 주문 단건 상세 조회 (주문 헤더 + 품목 + 아이템 + 이미지까지 한번에 로딩)
    @EntityGraph(attributePaths = {"orderItems", "orderItems.itemEntity", "orderItems.itemEntity.images"})
    Optional<OrdersEntity> findByOrdersId(Long ordersId);

    // 특정 회원의 주문 페이징 처리로
    Page<OrdersEntity> findByMemberId(MemberEntity memberId, Pageable pageable);


//    @EntityGraph(attributePaths = { "orderItems", "orderItems.itemEntity" })
//    Page<OrdersEntity> findByMemberId(String memberId, Pageable pageable);
//
//    default Optional<OrdersDTO> findSummaryById(Long ordersId) {
//        return findByOrdersId(ordersId).map(o -> {
//            // 총 수량 계산 : orderItems가 null이면 0, 아니면 각 품목의 quantity를 모두 합산
//            int totalQty = o.getOrderItems() == null ? 0 :
//                    o.getOrderItems().stream()
//                            .mapToInt(OrderEntity::getQuantity)
//                            .sum();
//
//            return OrdersDTO.builder()
//                    .ordersId(o.getOrdersId())
//                    .memberId(o.getMemberId())
//                    .cardId(o.getCardId())
//                    .totalPrice(o.getTotalAmount())
//                    .itemQuantity(totalQty)
//                    .build();
//        });
//    }

}
