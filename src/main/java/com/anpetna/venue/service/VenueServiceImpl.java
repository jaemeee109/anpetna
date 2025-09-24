package com.anpetna.venue.service;

import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;
import com.anpetna.venue.domain.VenueEntity;
import com.anpetna.venue.domain.VenueReservationEntity;
import com.anpetna.venue.dto.ListNearbyVenuesRes;
import com.anpetna.venue.dto.NearbyVenueDTO;
import com.anpetna.venue.dto.create.CreateVenueReservationReq;
import com.anpetna.venue.dto.create.CreateVenueReservationRes;
import com.anpetna.venue.repository.VenueRepository;
import com.anpetna.venue.repository.VenueReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class VenueServiceImpl implements VenueService {

    private final VenueRepository venueRepository;                 // 지점 조회용 JPA
    private final VenueReservationRepository reservationRepository; // 예약 저장용 JPA
    private final MemberRepository memberRepository;               // 회원 확인용 JPA

    /** 반경 제한 기반 조회 */
    @Override
    @Transactional(readOnly = true)
    public ListNearbyVenuesRes findNearby(double lat, double lng, Double radiusKm, Integer limit) {
        double radius = (radiusKm == null || radiusKm <= 0) ? 5.0 : radiusKm; // 기본 반경 5km
        int max = (limit == null || limit <= 0) ? 20 : Math.min(limit, 100);  // 기본 20, 상한 100

        // 1) active=true 인 모든 지점에 대해 거리 계산 → DTO 매핑 → 거리 오름차순 정렬
        List<NearbyVenueDTO> allSortedByDistance = venueRepository.findByActiveTrue().stream()
                .map(v -> {
                    double d = haversineKm(lat, lng, v.getLatitude(), v.getLongitude()); // 하버사인 거리(km)
                    return NearbyVenueDTO.builder()
                            .venueId(v.getVenueId())
                            .venueName(v.getVenueName())
                            .address(v.getAddress())
                            .phone(v.getPhone())
                            .latitude(v.getLatitude())
                            .longitude(v.getLongitude())
                            .distanceKm(round2(d)) // 소수 둘째 자리 반올림
                            .build();
                })
                .sorted(Comparator.comparingDouble(NearbyVenueDTO::getDistanceKm))
                .toList();

        // 2) 반경 이내 결과만 필터링하고 limit 적용
        List<NearbyVenueDTO> withinRadius = allSortedByDistance.stream()
                .filter(dto -> dto.getDistanceKm() <= radius)
                .limit(max)
                .toList();

        // 3) 반경 이내가 비어 있으면, '가장 가까운 1곳'을 반환 (요구사항 반영)
        if (withinRadius.isEmpty()) {
            List<NearbyVenueDTO> fallback = allSortedByDistance.stream()
                    .limit(1)
                    .toList();
            return ListNearbyVenuesRes.builder().items(fallback).build();
        }

        return ListNearbyVenuesRes.builder().items(withinRadius).build();
    }

    /** 반경 제한 없이 전체를 거리 오름차순으로 반환 */
    @Override
    @Transactional(readOnly = true)
    public ListNearbyVenuesRes listAllSortedByDistance(double lat, double lng) {
        List<NearbyVenueDTO> all = venueRepository.findByActiveTrue().stream()
                .map(v -> {
                    double dKm = haversineKm(lat, lng, v.getLatitude(), v.getLongitude());
                    return NearbyVenueDTO.builder()
                            .venueId(v.getVenueId())
                            .venueName(v.getVenueName())
                            .address(v.getAddress())
                            .phone(v.getPhone())
                            .latitude(v.getLatitude())
                            .longitude(v.getLongitude())
                            .distanceKm(round2(dKm))
                            .build();
                })
                .sorted(Comparator.comparingDouble(NearbyVenueDTO::getDistanceKm))
                .toList();

        return ListNearbyVenuesRes.builder().items(all).build();
    }

    /** 예약 생성 로직
     *  - 인증 안 되어 있으면 401
     *  - Venue/Member 존재 확인 없으면 404
     *  - 예약 저장 후 reservationId 반환
     */
    @Override
    public CreateVenueReservationRes reserve(String memberId, Long venueId, CreateVenueReservationReq req) {
        if (memberId == null || memberId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }

        VenueEntity venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "장소(Venue)를 찾을 수 없습니다."));

        MemberEntity member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        VenueReservationEntity saved = reservationRepository.save(
                VenueReservationEntity.builder()
                        .venue(venue)
                        .member(member)
                        .reservedAt(req.getReservedAt())
                        .memo(req.getMemo())
                        .build()
        );
        return CreateVenueReservationRes.builder().reservationId(saved.getReservationId()).build();
    }

    /** 하버사인 공식으로 거리(km) 계산 */
    private static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371.0088; // 지구 반경(km)
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat/2) * Math.sin(dLat/2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon/2) * Math.sin(dLon/2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    /** 소수 둘째 자리 반올림 */
    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
