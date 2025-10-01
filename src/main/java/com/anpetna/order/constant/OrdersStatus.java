package com.anpetna.order.constant;

public enum OrdersStatus {

    PENDING,   // 주문 생성(결제 전)
    PAID,      // 결제 완료
    SHIPMENT_READY, //배송준비중
    SHIPPED,   // 발송됨
    DELIVERED, // 배송 완료
    CANCELLED,  // 취소
    REFUNDED,   // 환불 완료
    CONFIRMATION // 구매확정
    

}
