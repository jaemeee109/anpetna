package com.anpetna.cart.service;

import com.anpetna.cart.dto.addCartItem.AddCartItemReq;
import com.anpetna.cart.dto.addCartItem.AddCartItemRes;
import com.anpetna.cart.dto.cartList.CartListReq;
import com.anpetna.cart.dto.cartList.CartListRes;
import com.anpetna.cart.dto.deleteCartItem.DeleteCartItemReq;
import com.anpetna.cart.dto.deleteCartItem.DeleteCartItemRes;
import com.anpetna.cart.dto.updateCartItemQuantity.UpdateCartItemQuantityReq;
import com.anpetna.cart.dto.updateCartItemQuantity.UpdateCartItemQuantityRes;
import jakarta.validation.Valid;

public interface CartService {

    // 자신의 장바구니에 상품 추가
    AddCartItemRes addItem(String memberId, @Valid AddCartItemReq request, String idempotencyKey);

    // 자신의 장바구니 조회
    CartListRes getCart(String memberId, CartListReq request);

    // 자신의 장바구니 상품 수량 수정
    UpdateCartItemQuantityRes updateQuantity(String memberId, String itemId, @Valid UpdateCartItemQuantityReq request);

    // 장바구니에 상품 삭제
    DeleteCartItemRes removeItem(String memberId, String itemId, DeleteCartItemReq request);
}
