package com.anpetna.order.repository;

import com.anpetna.item.domain.ItemEntity;
import com.anpetna.order.domain.OrderEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

// 주문 (품목) 엔티티를 DB에서 조회/저장/삭제하는 저장소

@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, Long> {
    // 첫번째 제네렉 : 엔티티 , 두 번째 : 엔티티의 PK 타입
    // JPA : 기본 CRUD(save, findById, findAll, deleteById 등 제공)

    @EntityGraph(attributePaths = {
            "itemEntity",
            "itemEntity.images"
    })

    // 특정 주문서 ID에 속한 모든 주문 품목을 조회
    List<OrderEntity> findByOrders_OrdersId(Long ordersId);
    // 조회 결과가 없으면 빈 리스트 반환

    // 특정 주문서 ID에 속한 모든 주문을 한번에 삭제
    long deleteByOrders_OrdersId(Long ordersId);
    // 제약 조건이 있기 때문에 자식(라인)을 먼저 삭제 후 부모(헤더)를 삭제함.

}
