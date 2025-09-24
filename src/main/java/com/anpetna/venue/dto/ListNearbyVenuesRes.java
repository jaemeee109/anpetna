package com.anpetna.venue.dto;

import lombok.*;
import java.util.List;

/** 가까운 지점 목록 응답 래퍼
 *  - items: NearbyVenueDTO 리스트
 *  - 컨트롤러에서 항상 이 DTO로 JSON 반환 (일관된 응답 형태)
 */
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class ListNearbyVenuesRes {
    private List<NearbyVenueDTO> items;
}
