package com.anpetna.order.controller;

import com.anpetna.order.constant.OrdersStatus;
import com.anpetna.order.dto.createOrderDTO.CreateOrderReq;
import com.anpetna.order.dto.readAllOrderDTO.ReadAllOrdersRes;
import com.anpetna.order.dto.readOneOrderDTO.ReadOneOrdersRes;
import com.anpetna.order.service.OrdersService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Validated // ✅ PathVariable/RequestParam 검증 활성화
@RestController
@RequestMapping("/order")
@RequiredArgsConstructor
public class OrderController {

    private final OrdersService ordersService;

    // ==============================================================

    /**
     * 전체 주문서(계산서) 목록 조회
     *
     * 요청 예시:
     * GET /anpetna/order?page=0&size=10&sort=ordersId,DESC
     * Authorization: Bearer <JWT>
     */
    @GetMapping
    public ReadAllOrdersRes getAllOrders(
            @PageableDefault(size = 10, sort = "ordersId", direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        return ordersService.getAllOrders(pageable);
    }

    /**
     * 특정 회원의 주문서(계산서) 목록 조회
     *
     * 요청 예시:
     * GET /anpetna/order/members/{memberId}?page=0&size=10&sort=ordersId,DESC
     */
    @GetMapping("/members/{memberId}")
    public ReadAllOrdersRes getOrdersByMember(
            @PathVariable String memberId,
            @PageableDefault(size = 10, sort = "ordersId", direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        return ordersService.getSummariesByMember(memberId, pageable);
    }

    /**
     * 주문서(계산서) 단건 상세 조회
     *
     * 요청 예시:
     * GET /anpetna/order/{ordersId}
     */
    @GetMapping("/{ordersId}")
    public ReadOneOrdersRes getOrderDetail(@PathVariable @Min(1) Long ordersId) {
        return ordersService.getDetail(ordersId);
    }

    // ==============================================================

    /**
     * 주문 생성
     * - 배송비는 프론트에서 넘겨주면 그 값을 사용
     * - 배송비를 안 넘기면 기본 3,000원 적용
     *
     * 요청 예시:
     * POST /anpetna/order
     * {
     *   "memberId": "user-001",
     *   "cardId": "card-xyz",
     *   "useSavedAddress": false,
     *   "shippingAddress": {
     *     "zipcode": "06236",
     *     "street": "서울시 강남구 테헤란로 123",
     *     "detail": "101동 1001호",
     *     "receiver": "홍길동"
     *   },
     *   "items": [
     *     { "itemId": 10, "quantity": 2 },
     *     { "itemId": 11, "quantity": 1 }
     *   ],
     *   "shippingFee": 3000 // (선택) 프론트에서 직접 전달. 없으면 기본값 사용
     * }
     */
    @PostMapping
    public ReadOneOrdersRes createOrder(@Valid @RequestBody CreateOrderReq req) {
        return ordersService.createOrder(req);
    }

    /**
     * 주문 상태 전이
     * - 허용 전이만 가능(PENDING→PAID/CANCELLED, PAID→SHIPPED/CANCELLED, SHIPPED→DELIVERED)
     *
     * 요청 예시:
     * PATCH /anpetna/order/123/status?next=PAID
     * PATCH /anpetna/order/123/status?next=SHIPPED
     * PATCH /anpetna/order/123/status?next=DELIVERED
     * PATCH /anpetna/order/123/status?next=CANCELLED
     */
    @PatchMapping("/{ordersId}/status")
    public ReadOneOrdersRes changeStatus(
            @PathVariable @Min(1) Long ordersId,
            @RequestParam OrdersStatus next
    ) {
        return ordersService.updateStatus(ordersId, next);
    }

    // ==============================================================

    //    // 주문 상세 조회 (이전 버전 예시)
    //    @GetMapping("/{ordersId}")
    //    public OrdersDTO getDetail(@PathVariable @Min(1) Long ordersId) {
    //        return ordersService.getDetail(ordersId);
    //    }

    //    // 회원별 주문 요약 페이징 조회 (이전 버전 예시)
    //    @GetMapping
    //    public Page<OrdersDTO> getSummariesByMember(
    //            @RequestParam @NotBlank String memberId,
    //            @PageableDefault(size = 10, sort = "ordersId", direction = Sort.Direction.DESC)
    //            Pageable pageable
    //    ) {
    //        return ordersService.getSummariesByMember(memberId, pageable);
    //    }

    //    // 주문 삭제 (라인 → 헤더 삭제는 Service에서 처리)
    //    @DeleteMapping("/{ordersId}")
    //    @ResponseStatus(HttpStatus.NO_CONTENT)
    //    public void delete(@PathVariable @Min(1) Long ordersId) {
    //        ordersService.delete(ordersId);
    //    }
}
