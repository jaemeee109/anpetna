package com.anpetna.venue.service;

import com.anpetna.venue.domain.VenueEntity;
import com.anpetna.venue.dto.ListNearbyVenuesRes;
import com.anpetna.venue.dto.create.CreateVenueReservationReq;
import com.anpetna.venue.dto.create.CreateVenueReservationRes;

import java.util.List;

/** Venue 관련 비즈니스 로직 인터페이스 */
public interface VenueService {
    /** 반경 제한 기반 조회 (없으면 기본 5km). 반경 내 없을 때는 '가장 가까운 1곳'을 반환 */
    ListNearbyVenuesRes findNearby(double lat, double lng, Double radiusKm, Integer limit);

    /** 반경 제한 없이 '거리 오름차순'으로 전체 목록 반환 */
    ListNearbyVenuesRes listAllSortedByDistance(double lat, double lng);

    /** 예약 생성(로그인 필요): memberId와 venueId, 예약정보를 받아 예약 레코드 생성 */
    CreateVenueReservationRes reserve(String memberId, Long venueId, CreateVenueReservationReq req);

    List<VenueEntity> listAll();
}
