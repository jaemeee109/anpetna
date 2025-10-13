package com.anpetna.venue.controller;

import com.anpetna.venue.dto.ListNearbyVenuesRes;

import com.anpetna.venue.service.VenueService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.*;

// 매장 주변 검색, 정렬, 목록 API
@RestController
@RequestMapping("/venue")
@RequiredArgsConstructor
public class VenueController {

    private final VenueService venueService;

    // 위도, 경도 기준으로 사용자 주변에서 가까운 순으로 매장 조회
    @GetMapping("/nearby")
    public ResponseEntity<ListNearbyVenuesRes> nearby(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(required = false) Double radiusKm,
            @RequestParam(required = false) Integer limit
    ) {
        // lat,lng : 사용자 좌표
        // radiusKm : 반경 km
        // limit : 최대 반환 개수

        return ResponseEntity.ok(
                venueService.findNearby(lat, lng, radiusKm, limit)
        );
    } //nearby 종료


    // 반경 제한 없이 '거리 오름차순' 으로 전체 매장 조회
    @GetMapping("/nearby-all")
    @Transactional(readOnly = true) // 읽기 전용
    public ResponseEntity<ListNearbyVenuesRes> nearbyAll(
            @RequestParam double lat,
            @RequestParam double lng
    ) {
        return ResponseEntity.ok(
                venueService.listAllSortedByDistance(lat, lng)
        );
    } // nearbyAll 종료



    // 간단한 목록 조회 (드롭다운 용)
    @GetMapping("/list")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> listAllForDropdown() {
        var venues = venueService.listAll();
        List<Map<String, Object>> items = new ArrayList<>();
        for (var v : venues) {
            var m = new LinkedHashMap<String, Object>();
            m.put("venueId", v.getVenueId());
            m.put("venueName", v.getVenueName());
            items.add(m);
        }
        return ResponseEntity.ok(items);
    } // listAllForDropdown 종료


} // VenueController Class 종료
