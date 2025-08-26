package com.anpetna.order.service;

import com.anpetna.order.dto.OrdersDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface OrdersService {

    // 주문 단건 상세
    OrdersDTO getDetail(Long ordersId);

    // 회원별 주문 요약 페이지(해당 회원의 모든 주문)
    Page<OrdersDTO> getSummariesByMember(String memberId, Pageable pageable);

    // getSummary -> 특정 주문 1건의 요약 정보만 반환
    // getSummariesByMember -> 나의 주문 화면 목록, 특정 회원의 주문들을 페이지 단위로 요약 리스트 반환

    // 한 건의 주문서 내에 있는 것들 전체 삭제
    void delete(Long ordersId);



}
