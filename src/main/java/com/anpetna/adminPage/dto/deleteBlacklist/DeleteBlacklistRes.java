package com.anpetna.adminPage.dto.deleteBlacklist;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DeleteBlacklistRes {

    Long id;
    String memberId;
    boolean previouslyActive;     // 해제 전 활성 여부
    boolean nowActive;            // 해제 후 활성 여부(항상 false 기대)
    LocalDateTime untilAtAfter;   // 해제 후 untilAt (now 로 세팅됨)
}

/**
 * 블랙리스트 해제(논리 삭제) 결과
 */