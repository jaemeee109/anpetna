package com.anpetna.order.service;

import com.anpetna.order.domain.OrderEntity;
import com.anpetna.order.domain.OrdersEntity;
import com.anpetna.order.repository.OrderRepository;
import com.anpetna.order.repository.OrdersRepository;
import com.anpetna.order.dto.OrdersDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service    // 비즈니스 로직으로 빈 등록
@RequiredArgsConstructor    // final 필드들을 자동으로 생성자 주입
@Transactional(readOnly = true) // 기본을 읽기 전용으로
public class OrdersServiceImpl implements OrdersService {

    private final OrdersRepository ordersRepository; // 주문서 테이블 접근용
    private final OrderRepository orderRepository;  // 주문 품목 테이블 접근용


    @Override
    public OrdersDTO getDetail(Long ordersId) { // 주문 한건 상세 조회

        if (ordersId == null) throw new IllegalArgumentException("ordersId는 비워둘 수 없습니다.");
        // 방어코드 : 파라미터가 null 이면 예외

        // 주문서 한 건으로 Optional 로 조회, 없으면 예외 발생
        // (OrdersRepository.findByOrdersId는 @EntityGraph로 orderItems까지 한 번에 로딩되도록 설계되어 있음)
        OrdersEntity e = ordersRepository.findByOrdersId(ordersId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다: " + ordersId));

        return toSummaryDTO(e); // 엔티티를 응답에 맞는 DTO로 반환해서 변환
    }



    // 회원별 주문서 페이지 조회
    @Override
    public Page<OrdersDTO> getSummariesByMember(String memberId, Pageable pageable) {   // 해당 회원의 다수 주문 목록을 페이지 단위로 반환
        // memberId의 주문들을 페이지 단위로 가져옴
        // page 안에 : getContent() -> 현재 페이지의 List<OrdersEntity>
        //            getTotalElements(), getTotalPages() -> 전체 건수/페이지 수
        //            getNumber(), getSize() -> 현재 페이지 번호/크기
        //            등의 메타데이터가 들어있음.

        // 방어 코드 작성
        if (memberId == null || memberId.isBlank()) throw new IllegalArgumentException("memberId는 비워둘 수 없습니다.");
        if (pageable == null) throw new IllegalArgumentException("pageable은 비워둘 수 없습니다.");

        return ordersRepository.findByMemberId(memberId, pageable).map(this::toSummaryDTO);
        // 회원 ID로 주문을 페이지 단위로 DB에서 가져오고 / 각 주문 엔티티를 요약 DTO로 바꿔서 page<OrdersDTO>로 돌려준다


    }





    @Override
    @Transactional  // delete는 쓰기 작업이므로 readOnly = false 트랙잭션으로 오버라이드
    public void delete(Long ordersId) {     // 삭제 메서드

        // 방어코드
        if (ordersId == null) throw new IllegalArgumentException("ordersId는 비워둘 수 없습니다.");

        // 하위 품목 먼저 삭제 후 헤더 삭제
        orderRepository.deleteByOrders_OrdersId(ordersId);
        // 자식(주문 품목)으로부터 지워 데이터 무결성(외래키 제약)문제 예방

        ordersRepository.deleteById(ordersId);
        // 부모(주문서) 삭제
    }





    /* =========================
       내부 매핑: Entity -> OrdersDTO
       ========================= */
    // private OrdersDTO toSummaryDTO(OrdersEntity i) {
    //        return OrdersDTO.builder()
    //                .ordersId(i.getOrdersId())
    //                .memberId(i.getMemberId())
    //                .cardId(i.getCardId())
    //                .totalPrice(i.getTotalAmount())
    //                .itemQuantity(
    //                        (i.getOrderItems() == null) ? 0
    //                                : i.getOrderItems().stream()
    //                                .mapToInt(OrderEntity::getQuantity)
    //                                .sum()
    //                )
    //                .build();
    //    } 아래 내용으로 수정


    private OrdersDTO toSummaryDTO(OrdersEntity orders) {   // 엔티티를 응답용으로 바꿈

        // 총 수량 계산
        int totalQty = (orders.getOrderItems() == null) ? 0 // null이면 0값 (보호코드)
                : orders.getOrderItems().stream()
                .mapToInt(OrderEntity::getQuantity) // 각 품목의 수량
                .sum();                             // 전체 수량 합계

        // 총 금액 계산
        int totalPrice = (orders.getOrderItems() == null) ? 0   // null이면 0값 (보호코드)
                : orders.getOrderItems().stream()
                .mapToInt(oi -> oi.getPrice() * oi.getQuantity()) // 품목마다 가 * 수량를 계산
                .sum(); // 총 금액 합계

        // 위에서 구한 합계를 포함해 요약 DTO를 빌더로 생성해서 반환.
        return OrdersDTO.builder()
                .ordersId(orders.getOrdersId())
                .memberId(orders.getMemberId())
                .cardId(orders.getCardId())
                .totalPrice(totalPrice)
                .itemQuantity(totalQty)
                .build();
        // 결과적으로 클라이언트는 주문ID/회원ID/카드ID/총 금액/총 수량만 간단히 받음.
    }



}