package com.anpetna.item.dto.registerReview;

import com.anpetna.item.dto.ImageListDTO;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.*;

@ToString
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor  //  Lombok @Builder 사용 시 getter만 있고 기본 생성자가 없음
//  ModelMapper는 기본 생성자로 객체를 생성하고 getter를 호출하려고 하는데, @Builder만 쓰면 기본 생성자가 없고, 빌더 패턴으로만 객체 생성 가능
//  따라서 getItemId()를 호출할 때 object is not an instance of declaring class 같은 오류 발생
public class RegisterReviewReq extends ImageListDTO {

    private String content;

    @Min(1)
    @Max(5)
    private int rating;

    private Long itemId;

}
