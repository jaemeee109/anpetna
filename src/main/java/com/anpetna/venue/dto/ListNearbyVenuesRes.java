package com.anpetna.venue.dto;

import lombok.*;
import java.util.List;

// 가까운 지점 응답용 DTO

@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class ListNearbyVenuesRes {
    private List<NearbyVenueDTO> items;
    //  각 지점의 정보(NearbyVenueDTO) 리스트
}
