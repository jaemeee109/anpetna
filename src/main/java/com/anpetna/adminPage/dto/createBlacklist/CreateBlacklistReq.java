package com.anpetna.adminPage.dto.createBlacklist;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CreateBlacklistReq {

    @NotBlank(message = "블랙리스트 처리할 유저 Id는 필수입력입니다.")
    private String memberId;

    @NotBlank(message = "사유는 필수입니다.")
    private String reason;

    @NotBlank(message = "기한은 필수입니다.")
    private String duration; // 기한 "D3"|"D5"|"D7"|"INDEFINITE"
}

/**
 * 블랙리스트 생성 요청
 * - reason   : 사유 (필수)
 * - duration : "D3" | "D5" | "D7" | "INDEFINITE"
 */
