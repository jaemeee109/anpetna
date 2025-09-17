package com.anpetna.notification.feature.keyword.dto;

import lombok.*;

import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ListKeywordRes {
    private List<KeywordSubscriptionDTO> items;

    public static ListKeywordRes of(List<KeywordSubscriptionDTO> items) {
        return ListKeywordRes.builder().items(items).build();
    }
}