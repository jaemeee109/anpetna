package com.anpetna.pay.controller;

import com.anpetna.notification.feature.order.service.OrderNotificationService;
import com.anpetna.order.constant.OrdersStatus;
import com.anpetna.order.domain.OrdersEntity;
import com.anpetna.order.repository.OrdersRepository;
import com.anpetna.pay.service.TossPaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/pay/toss")
public class TossPaymentController {

    private final OrdersRepository ordersRepository;
    private final TossPaymentService tossPaymentService;
    private final OrderNotificationService orderNotificationService;

    /**
     * 헤더만 사용: 최종 결제 금액은 OrdersEntity.totalAmount
     */
    private int computeOrderAmount(OrdersEntity order) {
        return order.getTotalAmount();
    }

    /**
     * 현재 로그인 사용자 ID 추출
     */
    private String currentMemberId(Authentication auth) {
        if (auth == null) return null;
        Object p = auth.getPrincipal();
        if (p instanceof UserDetails u) return u.getUsername();
        if (p instanceof OAuth2User ou) return ou.getName();
        if (p instanceof String s && !"anonymousUser".equals(s)) return s;
        return null;
    }

    /**
     * 결제 가능한 상태인지 (PENDING만 허용)
     */
    private void assertPayable(OrdersEntity order) {
        if (order.getStatus() != OrdersStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "결제 불가 상태");
        }
    }

    /**
     * 주문명: 라인 접근 없이 수량으로만 생성 (스냅샷/아이템명 접근하지 않음)
     */
    private String makeOrderName(OrdersEntity order) {
        int cnt = Math.max(0, order.getItemQuantity());
        if (cnt <= 0) return "주문";
        return (cnt == 1) ? "상품 1건" : "상품 " + cnt + "건";
    }

    @PostMapping("/prepare")
    public ResponseEntity<?> prepare(@RequestBody Map<String, Object> body, Authentication authentication) {
        Long orderNo = Long.valueOf(body.get("orderNo").toString());
        String method = String.valueOf(body.getOrDefault("method", "CARD"));

        // ✅ 헤더만 조회 (EntityGraph/라인아이템 경로를 전혀 타지 않음)
        OrdersEntity order = ordersRepository.findById(orderNo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "주문 없음"));

        // 소유자 검증 (필드명은 memberId 이지만 타입은 MemberEntity)
        String memberId = currentMemberId(authentication);
        if (memberId != null &&
                order.getMemberId() != null &&
                !memberId.equals(order.getMemberId().getMemberId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 주문만 결제 가능");
        }

        assertPayable(order);

        int amount = computeOrderAmount(order);
        if (amount <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "EMPTY_ORDER_AMOUNT");

        // 최소 결제금액 가드: 카드 100, 계좌 200
        int min = "ACCOUNT".equalsIgnoreCase(method) ? 200 : 100;
        if (amount < min) {
            return ResponseEntity.badRequest().body(Map.of(
                    "isSuccess", false,
                    "resCode", 400,
                    "resMessage", "MIN_AMOUNT_NOT_MET",
                    "result", Map.of("min", min, "amount", amount, "method", method)
            ));
        }

        String orderId = "ANP-" + order.getOrdersId() + "-" + System.currentTimeMillis();
        String orderName = makeOrderName(order);

        return ResponseEntity.ok(Map.of(
                "isSuccess", true,
                "result", Map.of(
                        "orderNo", order.getOrdersId(),
                        "orderId", orderId,
                        "totalAmount", amount,
                        "orderName", orderName
                )
        ));
    }

    @PostMapping("/confirm")
    public ResponseEntity<?> confirm(@RequestBody Map<String, Object> body, Authentication authentication) {
        // 1) 바디 파싱: paymentKey / orderId / 금액(totalAmount 우선, 없으면 amount)
        String paymentKey = asString(body.get("paymentKey"));
        String orderId = asString(body.get("orderId"));
        Object amountObj = body.containsKey("totalAmount") ? body.get("totalAmount") : body.get("amount");
        Integer clientAmount = toInt(amountObj);

        if (paymentKey == null || orderId == null || clientAmount == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "isSuccess", false, "resCode", 400, "resMessage", "invalid request"
            ));
        }

        Long orderNo;
        try {
            // "ANP-{ordersId}-{ts}"
            orderNo = Long.parseLong(orderId.split("-")[1]);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "orderId 형식 오류");
        }

        // ✅ 헤더만 조회
        OrdersEntity order = ordersRepository.findById(orderNo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "주문 없음"));

        // 소유자 검증
        String memberId = currentMemberId(authentication);
        if (memberId != null &&
                order.getMemberId() != null &&
                !memberId.equals(order.getMemberId().getMemberId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 주문만 결제 가능");
        }

        assertPayable(order);

        int serverAmount = computeOrderAmount(order);
        if (serverAmount <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "EMPTY_ORDER_AMOUNT");
        if (serverAmount != clientAmount) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "금액 불일치");

        // 토스 승인
        Map<String, Object> result = tossPaymentService.confirmPayment(paymentKey, orderId, serverAmount);

        // ✅ 결제 내역 DB 저장 (toss_payment)
        String orderName = makeOrderName(order); // 라인 접근 없이 헤더 수량으로 생성
        tossPaymentService.recordPayment(order, paymentKey, orderId, serverAmount, orderName, result);
        // 상태 갱신
        order.setStatus(OrdersStatus.PAID);
        ordersRepository.save(order);

        orderNotificationService.notifyOrderSuccess(memberId, clientAmount, orderId);

        return ResponseEntity.ok(Map.of("isSuccess", true, "result", result));
    }

    /**
     * null-safe String 변환
     */
    private String asString(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    /**
     * null-safe 정수 변환 (Number/문자열 모두 지원)
     */
    private Integer toInt(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(String.valueOf(v));
        } catch (Exception e) {
            return null;
        }
    }
}




//여기 아래는 위젯
//@RestController
//@RequiredArgsConstructor
//public class TossPaymentController {
//
//    private final TossPaymentService tossPaymentService;
//
//    @PostMapping("/api/pay/toss/prepare")
//    public ApiResult<TossPrepareRes> prepare(@RequestBody TossPrepareReq req) {
//        return new ApiResult<>(tossPaymentService.prepare(req));
//        // 전역 래퍼를 안 쓰면:
//        // return ResponseEntity.ok(tossPaymentService.prepare(req));
//    }
//
//    @PostMapping("/api/pay/toss/confirm")
//    public ApiResult<TossConfirmRes> confirm(@RequestBody TossConfirmReq req) {
//        return new ApiResult<>(tossPaymentService.confirm(req));
//        // 전역 래퍼를 안 쓰면:
//        // return ResponseEntity.ok(tossPaymentService.confirm(req));
//    }
//
//    // (선택) client-key 핑용
//    @GetMapping("/api/pay/toss/client-key")
//    public ResponseEntity<String> clientKeyPing() {
//        return ResponseEntity.ok("ok");
//    }
//}
