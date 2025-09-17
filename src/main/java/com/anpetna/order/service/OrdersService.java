package com.anpetna.order.service;

import com.anpetna.member.domain.MemberEntity;
import com.anpetna.order.constant.OrdersStatus;
import com.anpetna.order.dto.AddressDTO;
import com.anpetna.order.dto.createOrderDTO.CreateOrderReq;
import com.anpetna.order.dto.createOrderDTO.CreateOrderRes;
import com.anpetna.order.dto.readAllOrderDTO.ReadAllOrdersRes;
import com.anpetna.order.dto.readOneOrderDTO.ReadOneOrdersRes;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

public interface OrdersService {

    // 추가=========================================================

    CreateOrderRes create(String memberId, CreateOrderReq req);
    // =====================================================


    // 배송 상태 변경
    ReadOneOrdersRes updateStatus(Long ordersId, OrdersStatus nextStatus);

    // 배송지 변경 추가
    ReadOneOrdersRes updateAddress(Long ordersId, AddressDTO address);


    // 주문서 단건 상세 보기
    ReadOneOrdersRes getDetail(Long ordersId);


    // 전체 계산서 목록 요약 보기
    ReadAllOrdersRes getAllOrders(Pageable pageable);

    // 특정 회원의 계산서 목록 요약 보기
    ReadAllOrdersRes getSummariesByMember(String memberId, Pageable pageable);

}
