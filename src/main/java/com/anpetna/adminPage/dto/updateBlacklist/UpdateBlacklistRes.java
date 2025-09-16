package com.anpetna.adminPage.dto.updateBlacklist;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UpdateBlacklistRes {

    Long id;
    String memberId;
    String reason;
    String adminId;
    LocalDateTime untilAt;   // null=무기한
    boolean active;          // 현재 시점 활성 여부
    LocalDateTime createDate;
    LocalDateTime latestDate;
}

/* 블랙리스트 수정 결과 응답 DTO */

