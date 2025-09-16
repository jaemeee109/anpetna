package com.anpetna.pay.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TossPrepareReq {
    private Long orderNo;        // 선택: 기존 주문 결제라면 사용
    private String orderName;    // 주문명 (엔티티에 없어도 됨)
    private Integer totalAmount;      // 결제금액 (엔티티에 없어도 됨)
    private String customerName; // 고객명 (엔티티에 없어도 됨)
    private String  memberId;       // ★ 선택: 문자열 회원 ID (없으면 로그인/게스트 사용)
}
