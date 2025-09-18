package com.anpetna.order.repository;

import com.anpetna.item.domain.ItemEntity;
import com.anpetna.order.domain.OrderEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, Long> {
    List<OrderEntity> findByOrders_OrdersId(Long ordersOrdersId);

    // 주문서(헤더) PK + 아이템 PK로 라인 존재 여부 확인
    boolean existsByOrders_OrdersIdAndItem_ItemId(Long ordersId, Long itemId);


//    // 페이징 처리하여 한 주문서의 라인들(아이템들) 조회
//    @EntityGraph(attributePaths = {"itemEntity", "itemEntity.images"})
//    Page<OrderEntity> findByOrders_OrdersId(Long ordersId, Pageable pageable); // 페이징처리
//
//    // 특정 주문서에 속한 모든 라인 조회
//    @EntityGraph(attributePaths = {"itemEntity", "itemEntity.images"})
//    List<OrderEntity> findByOrders_OrdersId(Long ordersId);
// 라인 단위 페이징이 필요할 때 다시 사용


    // DB에서 계산 (자바에서 계산하면 대량 계산 시 부담)
//    // 총 수량 합계
//    @Query("select coalesce(sum(o.quantity), 0) " +
//            "from OrderEntity o where o.orders.ordersId = :ordersId")
//    int sumQuantityByOrdersId(@Param("ordersId") Long ordersId);
//
//    // 총 금액 합계
//    @Query("select coalesce(sum(o.price * o.quantity), 0) " +
//            "from OrderEntity o where o.orders.ordersId = :ordersId")
//    int sumAmountByOrdersId(@Param("ordersId") Long ordersId);



}
