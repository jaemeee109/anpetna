package com.anpetna.pay.domain;

import com.anpetna.core.coreDomain.BaseEntity;
import com.anpetna.order.domain.OrdersEntity;
import com.anpetna.pay.constant.TossPaymentMethod;
import com.anpetna.pay.constant.TossPaymentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "toss_payment",
        // ✔️ FK(order_id) 유니크 제거
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_toss_payment_key", columnNames = {"toss_payment_key"}),
                @UniqueConstraint(name = "uk_order_toss_id",   columnNames = {"order_toss_id"})
        },
        indexes = {
                // ✔️ 존재하는 FK 컬럼명으로 인덱스 (order_no → order_id 로 정정)
                @Index(name = "idx_toss_payment_order_id", columnList = "order_id"),
                @Index(name = "idx_toss_payment_status",   columnList = "toss_payment_status")
        }
)
@Getter
@Setter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class TossPaymentEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payment_no", nullable = false, unique = true)
    private Long paymentNo;

    /** 토스 결제 키(paymentKey). confirm 성공 후 세팅됨. */
    @Column(name = "toss_payment_key", unique = true, length = 128)
    private String tossPaymentKey;

    /** 상점 주문번호(토스 orderId로 전달하는 문자열). */
    @Column(name = "order_toss_id", nullable = false, unique = true, length = 100)
    private String orderTossId;  // ← 혼동 방지용으로 필드명 변경 권장

    /** 주문 FK (N:1). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)  // ✔️ FK 컬럼
    private OrdersEntity order;

    // ❌ 아래 read-only 매핑은 실제 컬럼이 없으면 제거하세요.
    // @Column(name = "order_no", insertable = false, updatable = false)
    // private Long orderNo;

    /** 사용자에게 보여줄 주문명 */
    @Column(name = "order_name", length = 200)
    private String orderName;

    /** 결제 총액(원 단위, 정수) */
    @Column(name = "total_amount", nullable = false)
    private int totalAmount;

    /** 결제수단 */
    @Enumerated(EnumType.STRING)
    @Column(name = "toss_payment_method", nullable = false, length = 32)
    private TossPaymentMethod tossPaymentMethod;

    /** 결제 상태 */
    @Enumerated(EnumType.STRING)
    @Column(name = "toss_payment_status", nullable = false, length = 32)
    private TossPaymentStatus tossPaymentStatus;

    /** 승인 시각 */
    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    /** 영수증 URL */
    @Column(name = "receipt_url", length = 500)
    private String receiptUrl;

    // BaseEntity(create_date/latest_date)가 NOT NULL이면 DB 기본값 또는 @Builder.Default 로 값 채우기
}
