package com.anpetna.pay.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TossConfirmReq {
    /** 토스에서 준 키 (명세: paymentKey) */
    private String paymentKey; // successUrl 쿼리에서 옴
    /** 위젯에 보낸 문자열 orderId와 동일해야 함 */
    private String orderId; // 문자열(= orderTossId)
    /** 금액 검증용(원) */
    private Integer totalAmount;  // successUrl 쿼리 그대로
}
