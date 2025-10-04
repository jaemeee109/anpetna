package com.anpetna.pay.service;

import com.anpetna.cart.domain.CartEntity;
import com.anpetna.cart.repository.CartRepository;
import com.anpetna.item.repository.ItemRepository;
import com.anpetna.notification.feature.order.service.OrderNotificationService;
import com.anpetna.notification.feature.stock.service.StockLowNotificationService;
import com.anpetna.order.constant.OrdersStatus;
import com.anpetna.order.domain.OrdersEntity;
import com.anpetna.order.repository.OrdersRepository;
import com.anpetna.pay.constant.TossPaymentMethod;
import com.anpetna.pay.constant.TossPaymentStatus;
import com.anpetna.pay.domain.TossPaymentEntity;
import com.anpetna.pay.repository.TossPaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TossPaymentService {

    @Value("${toss.secret-key}")
    private String tossSecretKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final TossPaymentRepository tossPaymentRepository;
    private final OrderNotificationService orderNotificationService;
    private final OrdersRepository ordersRepository;          // 주문 로드용
    private final CartRepository cartRepository;              // 장바구니 삭제용 (형님 프로젝트 명칭에 맞추세요)
    private final ItemRepository itemRepository;              // 재고 차감 저장용
    private final StockLowNotificationService stockLowNotificationService; // 재고 낮음 알림


    //결제창 url 생성
    @Transactional
    public String createPaymentUrl(String orderId, int amount, String orderName) {
        final String url = "https://api.tosspayments.com/v1/payments";
        final String basic = "Basic " + Base64.getEncoder()
                .encodeToString((tossSecretKey + ":").getBytes(StandardCharsets.UTF_8));
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(HttpHeaders.AUTHORIZATION, basic);

        Map<String, Object> body = Map.of(
                "amount", amount,
                "orderId", orderId,
                "orderName", orderName,
                "successUrl", "http://localhost:8000/toss-success.html",
                "failUrl", "http://localhost:8000/toss-fail.html"
        );
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new IllegalStateException("결제창 생성 실패: http=" + response.getStatusCode());
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> resBody = (Map<String, Object>) response.getBody();

            String checkoutUrl = extractCheckoutUrl(resBody);
            if (checkoutUrl == null || checkoutUrl.isBlank()) {
                throw new IllegalStateException("결제창 URL을 찾지 못했습니다. 응답=" + resBody);
            }

            log.debug("[Toss] checkoutUrl={}", checkoutUrl);
            return checkoutUrl;

        } catch (HttpStatusCodeException e) {
            String err = e.getResponseBodyAsString();
            throw new IllegalStateException("결제창 생성 오류: http=" + e.getStatusCode() + ", body=" + err, e);
        }
    }

    // 결제 승인
    @Transactional
    public Map<String, Object> confirmPayment(String paymentKey, String orderId, int amount) {

        // 0) 주문 로드 (orderId = ANP-<ordersId>-<ts>)
        Long ordersId = extractOrdersId(orderId);
        OrdersEntity order = ordersRepository.findByOrdersId(ordersId)
                .orElseThrow(() -> new IllegalStateException("주문을 찾을 수 없습니다: " + orderId));

        // 멱등 가드
        if (order.getStatus() == OrdersStatus.PAID) {
            return Map.of("status", "ALREADY_PAID", "ordersId", ordersId);
        }
        // 결제 가능 상태
        if (order.getStatus() != OrdersStatus.PENDING) {
            throw new IllegalStateException("결제 불가 상태: " + order.getStatus());
        }
        // 금액 일치
        if (order.getTotalAmount() != amount) {
            throw new IllegalStateException("결제 금액 불일치: expected=" + order.getTotalAmount() + ", got=" + amount);
        }

        // 토스 confirm 호출 준비
        final String url = "https://api.tosspayments.com/v1/payments/confirm";
        final String basic = "Basic " + Base64.getEncoder()
                .encodeToString((tossSecretKey + ":").getBytes(StandardCharsets.UTF_8));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(HttpHeaders.AUTHORIZATION, basic);

        Map<String, Object> body = Map.of(
                "paymentKey", paymentKey,
                "orderId", orderId,
                "amount", amount
        );
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> res = restTemplate.postForEntity(url, entity, Map.class);
            if (!res.getStatusCode().is2xxSuccessful()) {
                // 실패: 주문만 취소, 장바구니/재고는 손대지 않음
                if (order.getStatus() == OrdersStatus.PENDING) order.setStatus(OrdersStatus.CANCELLED);
                orderNotificationService.notifyOrderFail(orderId);
                throw new IllegalStateException("결제 승인 실패: http=" + res.getStatusCode() + ", body=" + res.getBody());
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> resBody = (Map<String, Object>) res.getBody();
            log.debug("[Toss] confirm OK: {}", resBody);

            // 1) 주문 상태 전이
            order.setStatus(OrdersStatus.PAID);

            // 2) 결제 레코드 저장 (형님이 이미 가진 메서드 재사용)
            String orderName = order.getOrdersThumbnail() != null ? order.getOrdersThumbnail() : "주문";
            recordPayment(order, paymentKey, orderId, amount, orderName, resBody);

            // 3) ✅ 결제 '성공'시에만 장바구니에서 해당 품목 제거
            String memberId = order.getMemberId().getMemberId();

            // 주문 라인아이템에서 구매한 itemId만 추출
            List<Long> purchasedItemIds = order.getOrderItems().stream()
                    .map(oi -> oi.getItem().getItemId())
                    .distinct()
                    .toList();

            // 회원 장바구니 전체 조회
            List<CartEntity> carts = cartRepository.findAllWithItemByMemberId(memberId);

            // 그 중 이번 주문에 포함된 itemId만 삭제
            List<CartEntity> toDelete = carts.stream()
                    .filter(c -> purchasedItemIds.contains(c.getItem().getItemId()))
                    .toList();

            if (!toDelete.isEmpty()) {
                cartRepository.deleteAll(toDelete);
            }

            // 4) ✅ 재고 차감 (create()에 있던 로직 그대로)
            for (var oi : order.getOrderItems()) {
                var item = oi.getItem();
                int qty   = oi.getQuantity();

                int cur = Math.max(0, item.getItemStock());
                int next = cur - qty;
                if (next < 0) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "재고가 부족합니다. itemId=" + item.getItemId() + ", 요청수량=" + qty + ", 현재고=" + cur);
                }
                item.setItemStock(next);
                item.setItemSellStatus(next <= 0
                        ? com.anpetna.item.constant.ItemSellStatus.SOLD_OUT
                        : com.anpetna.item.constant.ItemSellStatus.SELL);
                itemRepository.save(item);

                // 재고 낮음 알림
                stockLowNotificationService.notifyStockLow(item, next);
            }

            return resBody;

        } catch (HttpStatusCodeException e) {
            if (order.getStatus() == OrdersStatus.PENDING) order.setStatus(OrdersStatus.CANCELLED);
            orderNotificationService.notifyOrderFail(orderId);
            String err = e.getResponseBodyAsString();
            throw new IllegalStateException("Toss confirm error: http=" + e.getStatusCode() + ", body=" + err, e);
        }
    }
    //헬퍼
    // TossPaymentService 내부에 추가
    private Long extractOrdersId(String tossOrderId) {
        // 예: ANP-5-1757987887429  →  5
        int i1 = tossOrderId.indexOf('-');
        int i2 = tossOrderId.indexOf('-', i1 + 1);
        if (i1 < 0 || i2 < 0) throw new IllegalArgumentException("잘못된 orderId 형식: " + tossOrderId);
        return Long.parseLong(tossOrderId.substring(i1 + 1, i2));
    }



//    //결제 승인
//    @Transactional
//    public Map<String, Object> confirmPayment(String paymentKey, String orderId, int amount) {
//
//        final String url = "https://api.tosspayments.com/v1/payments/confirm";
//
//        final String basic = "Basic " + Base64.getEncoder()
//                .encodeToString((tossSecretKey + ":").getBytes(StandardCharsets.UTF_8));
//
//        HttpHeaders headers = new HttpHeaders();
//        headers.setContentType(MediaType.APPLICATION_JSON);
//        headers.set(HttpHeaders.AUTHORIZATION, basic);
//
//        Map<String, Object> body = Map.of(
//                "paymentKey", paymentKey,
//                "orderId", orderId,
//                "amount", amount
//        );
//        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
//
//        try {
//            ResponseEntity<Map> res = restTemplate.postForEntity(url, entity, Map.class);
//            if (!res.getStatusCode().is2xxSuccessful()) {
//                orderNotificationService.notifyOrderFail(orderId);
//                throw new IllegalStateException("결제 승인 실패: http=" + res.getStatusCode() + ", body=" + res.getBody());
//            }
//            @SuppressWarnings("unchecked")
//            Map<String, Object> resBody = (Map<String, Object>) res.getBody();
//            log.debug("[Toss] confirm OK: {}", resBody);
//            return resBody;
//
//        } catch (HttpStatusCodeException e) {
//            orderNotificationService.notifyOrderFail(orderId);
//            String err = e.getResponseBodyAsString();
//            throw new IllegalStateException("Toss confirm error: http=" + e.getStatusCode() + ", body=" + err, e);
//        }
//    }

    //토스 승인 응답 저장
    @Transactional
    public void recordPayment(OrdersEntity order,
                              String paymentKey,
                              String tossOrderId,      // "ANP-<ordersId>-<ts>"
                              int amount,
                              String orderName,        // 보여줄 주문명
                              Map<String, Object> res) {

        // 중복 방지
        if (paymentKey != null && tossPaymentRepository.existsByTossPaymentKey(paymentKey)) {
            log.info("[Toss] paymentKey {} already recorded. skip.", paymentKey);
            return;
        }

        // method/status/approvedAt/receiptUrl 파싱 (안전하게)
        String methodStr   = str(res.get("method"));      // 예: "CARD"
        String statusStr   = str(res.get("status"));      // 예: "DONE"
        String approvedStr = str(res.get("approvedAt"));  // ISO8601
        String receiptUrl  = null;
        Object receipt = res.get("receipt");
        if (receipt instanceof Map<?,?> m) {
            Object u = m.get("url");
            if (u != null) receiptUrl = String.valueOf(u);
        }

        TossPaymentEntity entity = TossPaymentEntity.builder()
                .order(order)
                .tossPaymentKey(paymentKey)
                .orderTossId(tossOrderId)
                .orderName(orderName)
                .totalAmount(amount)
                .tossPaymentMethod(safeEnum(TossPaymentMethod.class, methodStr, TossPaymentMethod.CARD))
                .tossPaymentStatus(safeEnum(TossPaymentStatus.class, statusStr, TossPaymentStatus.DONE))
                .approvedAt(parseIso(approvedStr))
                .receiptUrl(receiptUrl)
                .build();

        tossPaymentRepository.save(entity);
        log.info("[Toss] saved payment. id={}, key={}", entity.getPaymentNo(), paymentKey);

        if (entity.getTossPaymentStatus() == TossPaymentStatus.DONE) {
            String memberId = order.getMemberId().getMemberId();
            String orderIdStr = String.valueOf(order.getOrdersId());

            orderNotificationService.notifyOrderSuccess(memberId, amount, orderIdStr);
        }
    }

    // ---------- helpers ----------
    private String str(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private LocalDateTime parseIso(String s) {
        try {
            return s == null ? null : LocalDateTime.parse(s).toLocalDate().atTime(LocalTime.now());
        } catch (Exception e) {
            return null;
        }
    }

    private <E extends Enum<E>> E safeEnum(Class<E> t, String name, E def) {
        if (name == null) return def;
        try {
            return Enum.valueOf(t, name);
        } catch (Exception e) {
            return def;
        }
    }

    //checkoutUrl / checkout(string) / checkout.url(object) 모두 지원
    @SuppressWarnings("unchecked")
    private String extractCheckoutUrl(Map<String, Object> body) {
        if (body == null) return null;

        Object v1 = body.get("checkoutUrl");
        if (v1 instanceof String s1 && !s1.isBlank()) return s1;

        Object v2 = body.get("checkout");
        if (v2 instanceof String s2 && !s2.isBlank()) return s2;
        if (v2 instanceof Map<?, ?> m) {
            Object u = m.get("url");
            if (u instanceof String s3 && !s3.isBlank()) return s3;
        }

        Object links = body.get("_links");
        if (links instanceof Map<?, ?> lm) {
            Object checkout = lm.get("checkout");
            if (checkout instanceof Map<?, ?> cm) {
                Object href = cm.get("href");
                if (href instanceof String s4 && !s4.isBlank()) return s4;
            }
        }
        return null;
    }
}