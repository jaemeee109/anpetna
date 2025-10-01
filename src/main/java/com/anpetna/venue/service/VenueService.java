package com.anpetna.venue.service;

import com.anpetna.venue.domain.VenueEntity;
import com.anpetna.venue.dto.ListNearbyVenuesRes;


import java.util.List;

/** Venue 관련 비즈니스 로직 인터페이스 */
public interface VenueService {
    /** 반경 제한 기반 조회 (없으면 기본 5km). 반경 내 없을 때는 '가장 가까운 1곳'을 반환 */
    ListNearbyVenuesRes findNearby(double lat, double lng, Double radiusKm, Integer limit);

    /** 반경 제한 없이 '거리 오름차순'으로 전체 목록 반환 */
    ListNearbyVenuesRes listAllSortedByDistance(double lat, double lng);


    List<VenueEntity> listAll();
}
