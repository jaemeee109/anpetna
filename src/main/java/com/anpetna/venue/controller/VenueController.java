package com.anpetna.venue.controller;

import com.anpetna.venue.dto.ListNearbyVenuesRes;

import com.anpetna.core.service.VenueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;


@RestController                              // REST 컨트롤러 (JSON 반환)
@RequestMapping("/venue")                    // 이 클래스의 모든 엔드포인트 앞에 /venue 붙음
@RequiredArgsConstructor                     // final 필드 자동 생성자 주입 (venueService)
public class VenueController {

    private final VenueService venueService; // 비즈니스 로직은 서비스로 위임

    /** 사용자의 좌표 기준, 반경(radiusKm) 안의 지점들을 가까운 순으로 조회
     *  예: GET /venue/nearby?lat=37.5665&lng=126.9780&radiusKm=5&limit=20
     *  - lat/lng: 사용자 현재 위치
     *  - radiusKm: 반경(km). 없거나 0 이하이면 기본 5km
     *  - limit: 최대 반환 개수. 없으면 기본 20, 상한 100
     */
    @GetMapping("/nearby")
    public ResponseEntity<ListNearbyVenuesRes> nearby(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(required = false) Double radiusKm,
            @RequestParam(required = false) Integer limit
    ) {
        return ResponseEntity.ok(
                venueService.findNearby(lat, lng, radiusKm, limit) // 서비스 호출
        );
    }

    /** 반경 제한 없이, 사용자 좌표에서 '거리 오름차순'으로 모든 지점 조회
     *  예: GET /venue/nearby-all?lat=37.5665&lng=126.9780
     *  - 프론트에서 '내 위치 찾기'로 얻은 lat/lng를 넘기면 전체가 거리순으로 정렬되어 옴
     */
    @GetMapping("/nearby-all")
    @Transactional(readOnly = true) // 읽기 전용 트랜잭션 (성능/안전)
    public ResponseEntity<ListNearbyVenuesRes> nearbyAll(
            @RequestParam double lat,
            @RequestParam double lng
    ) {
        return ResponseEntity.ok(
                venueService.listAllSortedByDistance(lat, lng) // 서비스 호출
        );
    }



    // === NEW: 모든 지점 단순 목록 (드롭다운용) ===
    @GetMapping("/list")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> listAllForDropdown() {
        var venues = venueService.listAll(); // Service에서 전부 조회 (이름/ID만)
        List<Map<String, Object>> items = new ArrayList<>();
        for (var v : venues) {
            var m = new java.util.LinkedHashMap<String, Object>();
            m.put("venueId", v.getVenueId());
            m.put("venueName", v.getVenueName());
            items.add(m);
        }
        return ResponseEntity.ok(items);
    }

}
