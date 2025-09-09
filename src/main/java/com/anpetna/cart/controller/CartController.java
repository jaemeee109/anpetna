package com.anpetna.cart.controller;

import com.anpetna.cart.dto.addCartItem.AddCartItemReq;
import com.anpetna.cart.dto.addCartItem.AddCartItemRes;
import com.anpetna.cart.dto.cartList.CartListReq;
import com.anpetna.cart.dto.cartList.CartListRes;
import com.anpetna.cart.dto.deleteCartItem.DeleteCartItemReq;
import com.anpetna.cart.dto.deleteCartItem.DeleteCartItemRes;
import com.anpetna.cart.dto.updateCartItemQuantity.UpdateCartItemQuantityReq;
import com.anpetna.cart.dto.updateCartItemQuantity.UpdateCartItemQuantityRes;
import com.anpetna.cart.service.CartService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/cart")
@PreAuthorize("isAuthenticated()")  // 방어 심층화(Defense in Depth): 보안 설정이 바뀌거나 다른 필터체인/매칭 실수로 경로가 열려도, 메서드에서 한 번 더 걸러진다. & 비즈니스 규칙을 명시
public class CartController {

    private final CartService cartService;

    @Autowired
    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    /** 자신의 장바구니에 상품 추가(없서트)
     * anpetna/cart
     * 요청 예시
     * POST /anpetna/carts
     * Authorization: Bearer <JWT>
     **/
    /**
     *
     * Idempotency-Key : POST 같은 비멱등 요청에서 중복 요청(재시도/더블클릭/네트워크 재전송) 을 한 번만 처리하기 위해
     * 프런트에서 보낼 때(CORS 주의)
     * 브라우저에서 이 헤더를 보낼 경우 프리플라이트가 Access-Control-Allow-Headers 에 이 이름이 있어야 통과한다.
     */
    @PostMapping
    public ResponseEntity<AddCartItemRes> addItem(
            Authentication authentication,
            @Valid @RequestBody AddCartItemReq request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {

        String memberId = authentication.getName();
        AddCartItemRes response = cartService.addItem(memberId, request, idempotencyKey);
        return ResponseEntity.ok(response);
    }

    /** 자신의 장바구니 조회
     * anpetna/cart
     * 요청 예시
     * GET /anpetna/cart?page=1&size=20&sort=desc
     * Authorization: Bearer <JWT>
    **/
    @GetMapping
    public ResponseEntity<CartListRes> getMyCart(
            Authentication authentication,
            @Valid @ModelAttribute CartListReq request
    ) {

        String memberId = authentication.getName();
        CartListRes response = cartService.getCart(memberId, request);
        return ResponseEntity.ok(response);
    }


    /** 자신의 장바구니 상품 수량 수정
     * anpetna/cart/{itemId}
     * 요청 예시
     * PUT /anpetna/cart/{itemId}
     * Authorization: Bearer <JWT>
    **/
    @PutMapping("/{itemId}")
    public ResponseEntity<UpdateCartItemQuantityRes> updateQuantity(
            Authentication authentication,
            @PathVariable String itemId,
            @Valid @RequestBody UpdateCartItemQuantityReq request
    ) {

        String memberId = authentication.getName();
        UpdateCartItemQuantityRes response = cartService.updateQuantity(memberId, itemId, request);
        return ResponseEntity.ok(response);
    }



    /** 장바구니에 상품 삭제
    * anpetna/cart/{itemId}
    * 요청 예시
    * DELETE /anpetna/cart/{itemId}
    * Authorization: Bearer <JWT>
    **/
    @DeleteMapping("/{itemId}")
    public ResponseEntity<DeleteCartItemRes> deleteItem(
            Authentication authentication,
            @PathVariable String itemId,
            @RequestBody(required = false)DeleteCartItemReq request
    ) {

        String memberId = authentication.getName();
        DeleteCartItemRes response = cartService.removeItem(memberId, itemId, request);
        return ResponseEntity.ok(response);
    }

}
