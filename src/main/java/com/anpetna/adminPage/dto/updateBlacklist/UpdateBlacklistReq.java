package com.anpetna.adminPage.dto.updateBlacklist;

import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UpdateBlacklistReq {

    @Size(max = 500, message = "사유는 최대 500자입니다.")
    private String reason;      // 선택: 변경할 사유 (null/빈문자면 변경 안함)

    private String duration;    // 선택: D3|D5|D7|INDEFINITE (null 이면 변경 안함)
}

/*
 * 블랙리스트 수정 요청
 * 둘 중 하나만 보내도 됨 (reason 또는 duration)
 * duration 허용: D3 | D5 | D7 | INDEFINITE (대소문자 무시)
 */
