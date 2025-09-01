package com.anpetna.item.config;

import com.anpetna.cart.repository.CartRepository;
import com.anpetna.item.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@RequiredArgsConstructor
//@Component("authEvaluator")
public class AuthEvaluator{
    //  MethodSecurityInterceptor 호출시 SpEL용 클래스

    private final ReviewRepository reviewRepository;

    public boolean authorizeReview(Long reviewId, String memberId) {
        return reviewRepository.IsOwnerOfReview(reviewId, memberId);
    }

    //SpEL이 실제로 쓰이는 곳:
    //@Value("#{systemProperties['user.home']}") 같은 프로퍼티 주입
    //@PreAuthorize("principal.username == #user.username") 같은 메서드 보안
    //@Cacheable(key = "#dto.id") 같은 캐시 키 생성

}