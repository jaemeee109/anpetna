package com.anpetna.pay.constant;

/** 토스 status 값과 동일하게 맞추면 valueOf로 바로 매핑 가능. */
public enum TossPaymentStatus {
    PENDING,            // 준비(내부 상태)
    DONE,               // 결제 완료
    CANCELED,           // 전체 취소
    PARTIAL_CANCELED,   // 부분 취소
    ABORTED,            // 중단
    EXPIRED,            // 만료
    FAILED              // 실패
}
