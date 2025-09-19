package com.anpetna.order.repository;

import com.anpetna.member.domain.MemberEntity;
import com.anpetna.order.constant.OrdersStatus;
import com.anpetna.order.domain.OrdersEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface  OrdersRepository extends JpaRepository<OrdersEntity, Long> {

    // 주문 단건 상세 조회 (주문 헤더 + 품목 + 아이템 + 이미지까지 한번에 로딩)
    @EntityGraph(attributePaths = {"orderItems", "orderItems.item", "orderItems.item.images"})
    Optional<OrdersEntity> findByOrdersId(Long ordersId);

    // 특정 회원의 주문 페이징 처리로
    @EntityGraph(attributePaths = {"orderItems", "orderItems.item", "orderItems.item.images"})
    Page<OrdersEntity> findByMemberId_MemberId(String memberId, Pageable pageable);

    //
    @Query("""
        select o from OrdersEntity o
        where (:from is null or o.createDate >= :from)
          and (:to   is null or o.createDate <  :to)
          and (:status is null or o.status = :status)
          and (:memberId is null or o.memberId.memberId = :memberId)
    """)
    Page<OrdersEntity> findErpList(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("status") OrdersStatus status,
            @Param("memberId") String memberId,
            Pageable pageable
    );
    //총액 + 총 수량
    @Query("""
        select
          coalesce(sum(o.totalAmount - o.shippingFee),0),
          coalesce(sum(o.shippingFee),0),
          coalesce(sum(o.totalAmount),0),
          coalesce(sum(o.itemQuantity),0)
        from OrdersEntity o
        where (:from is null or o.createDate >= :from)
          and (:to   is null or o.createDate <  :to)
          and (:status is null or o.status = :status)
          and (:memberId is null or o.memberId.memberId = :memberId)
    """)
    List<Object[]> sumErp(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("status") OrdersStatus status,
            @Param("memberId") String memberId
    );

    //스프링 데이터 JPA에선 연관 엔티티의 내부 속성으로 검색할 때 “프로퍼티 경로”를 씁니다.
// 즉 OrdersEntity.memberId(=MemberEntity).memberId(=String)을 의미하도록 
// 메서드명을 findByMemberId_MemberId(...)로 변경

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

    Optional<OrdersEntity> findByOrdersIdAndMemberId_MemberId(Long ordersId, String memberId);

}