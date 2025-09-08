package com.anpetna.order.service;

import com.anpetna.order.dto.readAllOrderDTO.ReadAllOrdersRes;
import com.anpetna.order.dto.readOneOrderDTO.ReadOneOrdersRes;
import org.springframework.data.domain.Pageable;

public interface OrdersService {

    // 주문서 단건 상세 보기
    ReadOneOrdersRes getDetail(Long ordersId);

    // 전체 계산서 목록 요약 보기
    ReadAllOrdersRes getAllOrders(Pageable pageable);

    // 특정 회원의 계산서 목록 요약 보기
    ReadAllOrdersRes getSummariesByMember(String memberId, Pageable pageable);


}
