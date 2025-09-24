package com.anpetna.pay.dto;

import com.anpetna.pay.constant.TossPaymentMethod;
import com.anpetna.pay.constant.TossPaymentStatus;
import com.anpetna.pay.domain.TossPaymentEntity;
import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TossPaymentRes {
    private String tossPaymentKey;
    private String orderId;
    private Long orderNo;
    private Integer totalAmount;
    private TossPaymentStatus paymentStatus;
    private TossPaymentMethod method;
    private LocalDateTime approvedAt;   // 화면 표시 편의상 LocalDateTime로 변환
    private String receiptUrl;

    /** 엔티티 → 응답 변환 */
    public static TossPaymentRes from(TossPaymentEntity p) {
        return TossPaymentRes.builder()
                .tossPaymentKey(p.getTossPaymentKey())
                .orderId(p.getOrderTossId())
                //.orderNo(p.getOrder().getOrderId())
                .totalAmount(p.getTotalAmount())
                .paymentStatus(p.getTossPaymentStatus())
                .method(p.getTossPaymentMethod())
                .approvedAt(p.getApprovedAt())
                .receiptUrl(p.getReceiptUrl())
                .build();
    }
}
