package com.anpetna.auth;

import com.anpetna.cart.repository.CartRepository;
import com.anpetna.item.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@RequiredArgsConstructor
@Component("authEvaluator")
public class AuthEvaluator{
    //  MethodSecurityInterceptor 호출시 SpEL용 클래스

    private final ReviewRepository reviewRepository;
    private final CartRepository cartRepository;


    public boolean authorizeReview(Long reviewId, String memberId) {
        return reviewRepository.IsOwnerOfReview(reviewId, memberId);
    }

    public boolean authorizeCart(Long cartId, String memberId) {
        //  return cartRepository.IsOwnerOfReview(reviewId, memberId);
        return false;
    }



}
