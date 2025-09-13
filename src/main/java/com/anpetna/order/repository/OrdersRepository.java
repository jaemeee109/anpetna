package com.anpetna.order.repository;

import aj.org.objectweb.asm.commons.Remapper;
import com.anpetna.order.constant.OrdersStatus;
import com.anpetna.order.domain.OrdersEntity;
import jakarta.validation.constraints.NotBlank;
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
    Page<OrdersEntity> findByMemberId(String memberId, Pageable pageable);

    // 회원 가져오기 페이징 처리
    Page<OrdersEntity> findByMember_MemberId(String memberId, Pageable pageable);

    // 추가
    Optional<OrdersEntity>
    findTopByMember_MemberIdAndStatusOrderByOrdersIdDesc(String memberId, OrdersStatus status);
}
