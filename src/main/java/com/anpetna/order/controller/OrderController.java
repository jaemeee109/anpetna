package com.anpetna.order.controller;

import com.anpetna.order.dto.OrdersDTO;
import com.anpetna.order.repository.OrderRepository;
import com.anpetna.order.service.OrdersService;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Validated // ✅ PathVariable/RequestParam 검증 활성화
@RestController
@RequestMapping("/order")
@RequiredArgsConstructor
public class OrderController {


    private final OrdersService ordersService;

    // 주문 상세 조회
    @GetMapping("/{ordersId}")
    public OrdersDTO getDetail(@PathVariable @Min(1) Long ordersId) {
        return ordersService.getDetail(ordersId);
    }

    // 회원별 주문 요약 페이징 조회
    @GetMapping
    public Page<OrdersDTO> getSummariesByMember(
            @RequestParam @NotBlank String memberId,
            @PageableDefault(size = 10, sort = "ordersId", direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        return ordersService.getSummariesByMember(memberId, pageable);
    }

    // 주문 삭제 (라인 → 헤더 삭제는 Service에서 처리)
    @DeleteMapping("/{ordersId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable @Min(1) Long ordersId) {
        ordersService.delete(ordersId);
    }


}
