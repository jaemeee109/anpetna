package com.anpetna.notification.feature.keyword.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DeleteKeywordRes {
    private Long kId;
    private boolean deleted;

    public static DeleteKeywordRes ok(Long kId) {
        return DeleteKeywordRes.builder().kId(kId).deleted(true).build();
    }
}