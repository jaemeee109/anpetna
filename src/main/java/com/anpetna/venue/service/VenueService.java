package com.anpetna.venue.service;

import com.anpetna.venue.domain.VenueEntity;
import com.anpetna.venue.dto.ListNearbyVenuesRes;


import java.util.List;

// 매장 조회
public interface VenueService {
    // 반경 제한 기반 조회
    ListNearbyVenuesRes findNearby(double lat, double lng, Double radiusKm, Integer limit);

    // 반경 제한 없이 '거리 오름차순'으로 전체 목록 반환
    ListNearbyVenuesRes listAllSortedByDistance(double lat, double lng);

    // 단순 전체 목록 (정렬/거리 계산 미적용)
    List<VenueEntity> listAll();
}
