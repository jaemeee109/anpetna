package com.anpetna.adminPage.dto.readBlacklist;

import lombok.*;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReadBlacklistReq {

    private String keyword;

    @Builder.Default
    private Boolean activeOnly = Boolean.TRUE; // 기본값: 활성만
}

/*
 * 블랙리스트 목록 조회 요청 파라미터
 * keyword   : memberId 부분검색(대소문자 무시). 미입력이면 전체.
 * activeOnly: true  = 현재 활성(무기한 or 만료 전)만
 *               false = 전체 이력(만료 포함)
 */
