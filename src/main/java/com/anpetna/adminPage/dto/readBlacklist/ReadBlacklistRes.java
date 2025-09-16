package com.anpetna.adminPage.dto.readBlacklist;

import com.anpetna.core.coreDomain.BaseEntity;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReadBlacklistRes {

    List<Row> content;
    long totalElements;
    int totalPages;
    int page;
    int size;
    String sort;

    /*
     * 목록 한 줄(Row)
     * - untilAt: null 이면 무기한
     * - active : 현재 시점 활성 여부
     * - createdAt: BaseEntity 에 생성시각이 있을 때만 사용. 없으면 제거해도 무방.
     */
    @Getter
    @Setter
    @ToString
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Row extends BaseEntity {
        Long id;                // 블랙리스트 id
        String memberId;        // 멤버 id
        String reason;          // 사유
        String adminId;         // 지정한 관리자 id
        LocalDateTime untilAt;  // null = 무기한 기한
        boolean active;         // 현재 활성 여부
        LocalDateTime createDate;
        LocalDateTime latestDate;

    }
}
