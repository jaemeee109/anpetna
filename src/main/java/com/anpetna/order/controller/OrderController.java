package com.anpetna.order.controller;

import com.anpetna.ApiResult;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;   // ★ 추가
import com.anpetna.order.constant.OrdersStatus;
import com.anpetna.order.dto.AddressDTO;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Validated // ✅ PathVariable/RequestParam 검증 활성화
@RestController
@RequestMapping("/order")
@RequiredArgsConstructor
public class OrderController {

    private final OrdersService ordersService;
    private final MemberRepository memberRepository;

    // ==============================================================

    /** 주문 생성 (직구/장바구니 겸용)
     *  - 인증 사용자 ID(String) → MemberEntity 로드 후 Service에 전달
     *  - @Valid는 프론트 단계에서 검증 중이라면 생략 가능(필요시 부활)
     */
    @PostMapping("/buy")
    @PreAuthorize("hasRole('USER')")
    public ApiResult<CreateOrderRes> create(
            Authentication authentication,
            @RequestBody CreateOrderReq req
    ) {
        String loginId = authentication.getName();
        MemberEntity member = memberRepository.getReferenceById(loginId);

        CreateOrderRes body = ordersService.create(member, req);
        return new ApiResult<>(body);
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
    public ApiResult<ReadAllOrdersRes> getAllOrders(
            @PageableDefault(size = 10, sort = "ordersId", direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        ReadAllOrdersRes body = ordersService.getAllOrders(pageable);
        return new ApiResult<>(body); // 200 OK
    }

    /**
     * 특정 회원의 주문서(계산서) 목록 조회
     *
     * 요청 예시:
     * GET /anpetna/order/members/{memberId}?page=0&size=10&sort=ordersId,DESC
     */
    @GetMapping("/members/{memberId}")
    public ApiResult<ReadAllOrdersRes> getOrdersByMember(
            @PathVariable("memberId") String memberId,   // 문자열로 받고
            @PageableDefault(size = 10, sort = "ordersId", direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        // memberId(String) → MemberEntity 변환
        MemberEntity member = memberRepository.getReferenceById(memberId);

        ReadAllOrdersRes body = ordersService.getSummariesByMember(member, pageable);
        return new ApiResult<>(body); // 200 OK
    }

    /**
     * 주문서(계산서) 단건 상세 조회
     *
     * 요청 예시:
     * GET /anpetna/order/{ordersId}
     */
    @GetMapping("/{ordersId}")
    public ApiResult<ReadOneOrdersRes> getOrderDetail(
            @PathVariable @Min(1) Long ordersId
    ) {
        ReadOneOrdersRes body = ordersService.getDetail(ordersId);
        return new ApiResult<>(body); // 200 OK
    }

    // ==============================================================

    /**
     * 주문 상태 전이
     * - 허용 전이만 가능(PENDING→PAID/CANCELLED, PAID→SHIPPED/CANCELLED, SHIPPED→DELIVERED …)
     *
     * 요청 예시:
     * PATCH /anpetna/order/123/status?next=PAID
     */
    @PatchMapping("/{ordersId}/status")
    public ApiResult<ReadOneOrdersRes> changeStatus(
            @PathVariable @Min(1) Long ordersId,
            @RequestParam OrdersStatus next
    ) {
        ReadOneOrdersRes body = ordersService.updateStatus(ordersId, next);
        return new ApiResult<>(body); // 200 OK
    }

    // ==============================================================

    /** 배송지 변경 */
    @PatchMapping("/{ordersId}/address")
    public ApiResult<ReadOneOrdersRes> updateAddress(
            @PathVariable @Min(1) Long ordersId,
            @Valid @RequestBody AddressDTO address
    ) {
        ReadOneOrdersRes body = ordersService.updateAddress(ordersId, address);
        return new ApiResult<>(body);
    }
}
