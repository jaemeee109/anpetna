package com.anpetna.item.dto.registerReview;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * 리뷰 등록 결과 응답 DTO
 * - 컨트롤러/서비스에서 return res.registered() 호출을 지원하기 위해
 *   registered() 메서드를 구현해야 함.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterReviewRes {

    private Long reviewId;

    private LocalDateTime regDate;

    private String itemId;

    private String res;

    private String imageUrl;

    private String memberId;

    private String content;

    /** 서비스 단에서 호출하는 편의 메소드 */
    public RegisterReviewRes registered() {
        // 그대로 자신(this)을 반환해 직렬화 가능하게 한다.
        return this;

    }

}
