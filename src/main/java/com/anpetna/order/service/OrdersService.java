package com.anpetna.order.service;

import com.anpetna.order.dto.OrdersDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface OrdersService {

    /** 주문 상세 */
    OrdersDTO getDetail(Long ordersId);

    /** 주문 요약(합계/총수량)  */
    OrdersDTO getSummary(Long ordersId);

    /** 회원별 주문 요약 페이지  */
    Page<OrdersDTO> getSummariesByMember(String memberId, Pageable pageable);

    /** 주문 삭제 */
    void delete(Long ordersId);

}
