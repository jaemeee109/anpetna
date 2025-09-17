package com.anpetna.notification.feature.keyword.dto;

import com.anpetna.board.constant.BoardType;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class CreateKeywordReq {

    @NotBlank(message = "keyword must not be blank")
    private String keyword;              // 그대로 contains 매칭할 문자열

    private BoardType scopeBoardType;    // null이면 전체 보드 대상
}
