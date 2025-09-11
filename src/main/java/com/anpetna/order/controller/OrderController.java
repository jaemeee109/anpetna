package com.anpetna.order.controller;

import com.anpetna.ApiResult;
import com.anpetna.order.constant.OrdersStatus;
import com.anpetna.order.dto.createOrderDTO.CreateOrderReq;
import com.anpetna.order.dto.createOrderDTO.CreateOrderRes;
import com.anpetna.order.dto.readAllOrderDTO.ReadAllOrdersRes;
import com.anpetna.order.dto.readOneOrderDTO.ReadOneOrdersRes;
import com.anpetna.order.service.OrdersService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@Validated // ✅ PathVariable/RequestParam 검증 활성화
@RestController
@RequestMapping("/order")
@RequiredArgsConstructor
public class OrderController {
    private final OrdersService ordersService;


    // ==============================================================

    /** 주문 생성 (직구/장바구니 겸용) */
    @PostMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResult<CreateOrderRes>> create(
            Authentication authentication,
            @Valid @RequestBody CreateOrderReq req
    ) {
        String memberId = authentication.getName();
        CreateOrderRes res = ordersService.create(memberId, req);

        return ResponseEntity.ok(new ApiResult<>(res));
    }


    // ==============================================================

    /**
     * 전체 주문서(계산서) 목록 조회
     *
     * 요청 예시:
     * GET /anpetna/order?page=0&size=10&sort=ordersId,DESC
     * Authorization: Bearer <JWT>
     */
    @GetMapping
    public ResponseEntity<ReadAllOrdersRes> getAllOrders(
            @PageableDefault(size = 10, sort = "ordersId", direction = Sort.Direction.DESC)
            Pageable pageable) {
        ReadAllOrdersRes body = ordersService.getAllOrders(pageable);
        return ResponseEntity.ok(body); // 200 OK
    }

    /**
     * 특정 회원의 주문서(계산서) 목록 조회
     *
     * 요청 예시:
     * GET /anpetna/order/members/{memberId}?page=0&size=10&sort=ordersId,DESC
     */
    @GetMapping("/members/{memberId}")
    public ResponseEntity<ReadAllOrdersRes> getOrdersByMember(
            @PathVariable String memberId,
            @PageableDefault(size = 10, sort = "ordersId", direction = Sort.Direction.DESC)
            Pageable pageable) {
        ReadAllOrdersRes body = ordersService.getSummariesByMember(memberId, pageable);
        return ResponseEntity.ok(body); // 200 OK
    }

    /**
     * 주문서(계산서) 단건 상세 조회
     *
     * 요청 예시:
     * GET /anpetna/order/{ordersId}
     */
    @GetMapping("/{ordersId}")
    public ResponseEntity<ReadOneOrdersRes> getOrderDetail(@PathVariable @Min(1) Long ordersId) {
        ReadOneOrdersRes body = ordersService.getDetail(ordersId);
        return ResponseEntity.ok(body); // 200 OK
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
     *   "shippingAddress": {...},
     *   "items": [ { "itemId": 10, "quantity": 2 }, ... ],
     *   "shippingFee": 3000 // (선택) 프론트에서 직접 전달. 없으면 기본값 사용
     * }
     */
    @PostMapping
    public ResponseEntity<ReadOneOrdersRes> createOrder(@Valid @RequestBody CreateOrderReq req) {
        ReadOneOrdersRes created = ordersService.createOrder(req);

        // 201 Created + Location 헤더(/anpetna/order/{ordersId})
        URI location = URI.create("/anpetna/order/" + created.getOrdersId());
        return ResponseEntity
                .created(location) // = status 201 + Location
                .body(created);
    }

    /**
     * 주문 상태 전이
     * - 허용 전이만 가능(PENDING→PAID/CANCELLED, PAID→SHIPPED/CANCELLED, SHIPPED→DELIVERED …)
     *
     * 요청 예시:
     * PATCH /anpetna/order/123/status?next=PAID
     */
    @PatchMapping("/{ordersId}/status")
    public ResponseEntity<ReadOneOrdersRes> changeStatus(
            @PathVariable @Min(1) Long ordersId,
            @RequestParam OrdersStatus next
    ) {
        ReadOneOrdersRes body = ordersService.updateStatus(ordersId, next);
        return ResponseEntity.ok(body); // 200 OK
    }

    // ==============================================================

    //    // 주문 삭제 (라인 → 헤더 삭제는 Service에서 처리)
    //    @DeleteMapping("/{ordersId}")
    //    public ResponseEntity<Void> delete(@PathVariable @Min(1) Long ordersId) {
    //        ordersService.delete(ordersId);
    //        return ResponseEntity.noContent().build(); // 204 No Content
    //    }
}
