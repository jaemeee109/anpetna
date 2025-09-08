package com.anpetna.order.controller;

import com.anpetna.order.dto.readAllOrderDTO.ReadAllOrdersRes;
import com.anpetna.order.dto.readOneOrderDTO.ReadOneOrdersRes;
import com.anpetna.order.service.OrdersService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Validated // ✅ PathVariable/RequestParam 검증 활성화
@RestController
@RequestMapping("/anpetna/order")
@RequiredArgsConstructor
public class OrderController {


    private final OrdersService ordersService;


    // ==============================================================



    /**
     * 전체 주문서(계산서) 목록 조회
     *
     * 요청 예시:
     * GET /orders?page=0&size=10&sort=ordersId,DESC
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
     * GET /orders/{memberId}?page=0&size=10&sort=ordersId,DESC
     */
    @GetMapping("members/{memberId}")
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
     * GET /orders/{ordersId}
     */
    @GetMapping("/{ordersId}")
    public ReadOneOrdersRes getOrderDetail(@PathVariable Long ordersId) {
        return ordersService.getDetail(ordersId);
    }

    // ==============================================================





//    // 주문 상세 조회
//    @GetMapping("/{ordersId}")
//    public OrdersDTO getDetail(@PathVariable @Min(1) Long ordersId) {
//        return ordersService.getDetail(ordersId);
//    }


//    // 회원별 주문 요약 페이징 조회
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
