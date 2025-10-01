package com.anpetna.pay.service;

import com.anpetna.notification.feature.order.service.OrderNotificationService;
import com.anpetna.order.domain.OrdersEntity;
import com.anpetna.pay.constant.TossPaymentMethod;
import com.anpetna.pay.constant.TossPaymentStatus;
import com.anpetna.pay.domain.TossPaymentEntity;
import com.anpetna.pay.repository.TossPaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Base64;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TossPaymentService {
    @Value("${toss.client-key}")
    private String tossClientKey;
    @Value("${toss.secret-key}")
    private String tossSecretKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final TossPaymentRepository tossPaymentRepository;
    private final OrderNotificationService orderNotificationService;

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
                "successUrl", "http://localhost:8080/toss-success.html",
                "failUrl", "http://localhost:8080/toss-fail.html"
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

    //결제 승인
    @Transactional
    public Map<String, Object> confirmPayment(String paymentKey, String orderId, int amount) {

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
                orderNotificationService.notifyOrderFail(orderId);
                throw new IllegalStateException("결제 승인 실패: http=" + res.getStatusCode() + ", body=" + res.getBody());
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> resBody = (Map<String, Object>) res.getBody();
            log.debug("[Toss] confirm OK: {}", resBody);
            return resBody;

        } catch (HttpStatusCodeException e) {
            orderNotificationService.notifyOrderFail(orderId);
            String err = e.getResponseBodyAsString();
            throw new IllegalStateException("Toss confirm error: http=" + e.getStatusCode() + ", body=" + err, e);
        }
    }

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