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
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {


    private final OrdersService ordersService;

    /** 주문 상세 */
    @GetMapping("/{ordersId}")
    public ResponseEntity<OrdersDTO> getDetail(@PathVariable @Min(1) Long ordersId) {
        return ResponseEntity.ok(ordersService.getDetail(ordersId));
    }

    /** 주문 요약 */
    @GetMapping("/{ordersId}/summary")
    public ResponseEntity<OrdersDTO> getSummary(@PathVariable @Min(1) Long ordersId) {
        return ResponseEntity.ok(ordersService.getSummary(ordersId));
    }

    /** 회원별 주문 요약 페이징 조회 */
    @GetMapping
    public ResponseEntity<Page<OrdersDTO>> getSummariesByMember(
            @RequestParam @NotBlank String memberId,
            @PageableDefault(size = 10, sort = "ordersId", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(ordersService.getSummariesByMember(memberId, pageable));
    }

    /** 주문 삭제 (라인 먼저 삭제 후 헤더 삭제는 Service에서 처리) */
    @DeleteMapping("/{ordersId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable @Min(1) Long ordersId) {
        ordersService.delete(ordersId);
    }

    /** 404 매핑 */
    @ExceptionHandler({IllegalArgumentException.class, EmptyResultDataAccessException.class})
    public ResponseEntity<Map<String, Object>> handleNotFound(RuntimeException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", "NOT_FOUND",
                "message", e.getMessage()
        ));
    }

    /** 400 매핑 (검증 실패) */
    @ExceptionHandler({ConstraintViolationException.class, MethodArgumentNotValidException.class})
    public ResponseEntity<Map<String, Object>> handleBadRequest(Exception e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", "BAD_REQUEST",
                "message", e.getMessage()
        ));
    }

}
