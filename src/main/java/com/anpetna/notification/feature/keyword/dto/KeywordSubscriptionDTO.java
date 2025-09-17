package com.anpetna.notification.feature.keyword.dto;

import com.anpetna.board.constant.BoardType;
import com.anpetna.notification.feature.keyword.domain.KeywordSubscriptionEntity;
import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class KeywordSubscriptionDTO {

    private Long kId;                    // PK (주의: kId 네이밍 유지)
    private String keyword;              // 원문 키워드
    private BoardType scopeBoardType;    // 스코프(보드타입), null 가능

    // 보여주기/디버깅 편의용(네 BaseEntity 필드)
    private LocalDateTime createDate;
    private LocalDateTime latestDate;

    private String subscriberMemberId;   // 소유자 표시가 필요할 때

    public static KeywordSubscriptionDTO from(KeywordSubscriptionEntity e) {
        return KeywordSubscriptionDTO.builder()
                .kId(e.getKId())
                .keyword(e.getKeyword())
                .scopeBoardType(e.getScopeBoardType())
                .createDate(e.getCreateDate())
                .latestDate(e.getLatestDate())
                .subscriberMemberId(e.getSubscriber().getMemberId())
                .build();
    }
}
