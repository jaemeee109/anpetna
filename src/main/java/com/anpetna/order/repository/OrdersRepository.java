package com.anpetna.order.repository;

<<<<<<< HEAD
import aj.org.objectweb.asm.commons.Remapper;
import com.anpetna.order.constant.OrdersStatus;
import com.anpetna.order.domain.OrdersEntity;
import jakarta.validation.constraints.NotBlank;
=======
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.order.constant.OrdersStatus;
import com.anpetna.order.domain.OrdersEntity;
>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
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
<<<<<<< HEAD
    Page<OrdersEntity> findByMemberId(String memberId, Pageable pageable);

    // 회원 가져오기 페이징 처리
    Page<OrdersEntity> findByMember_MemberId(String memberId, Pageable pageable);
=======
    Page<OrdersEntity> findByMember(MemberEntity member, Pageable pageable);
    Optional<OrdersEntity> findTopByMemberAndStatusOrderByOrdersIdDesc(
            MemberEntity member, OrdersStatus status);


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
>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")

    // 추가
    Optional<OrdersEntity>
    findTopByMember_MemberIdAndStatusOrderByOrdersIdDesc(String memberId, OrdersStatus status);
}
