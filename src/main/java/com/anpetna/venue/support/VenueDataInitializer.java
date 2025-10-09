/*

package com.anpetna.venue.support;

import com.anpetna.venue.domain.VenueEntity;
import com.anpetna.venue.repository.VenueRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

// 더미 데이터 용

@Component
@RequiredArgsConstructor
@Slf4j
public class VenueDataInitializer {

    private final VenueRepository venueRepository;

    @PostConstruct
    void init() {
        if (venueRepository.count() > 0) return;

        log.info("[venue] seeding sample venues...");

        venueRepository.save(VenueEntity.builder()
                .venueName("안펫나 강남점")
                .address("서울 강남구 테헤란로 123")
                .phone("02-000-0001")
                .latitude(37.498095)
                .longitude(127.027610)
                .active(true)
                .build());

        venueRepository.save(VenueEntity.builder()
                .venueName("안펫나 시청점")
                .address("서울 중구 세종대로 110")
                .phone("02-000-0002")
                .latitude(37.5662952)
                .longitude(126.9779451)
                .active(true)
                .build());

        venueRepository.save(VenueEntity.builder()
                .venueName("안펫나 홍대점")
                .address("서울 마포구 양화로 160")
                .phone("02-000-0003")
                .latitude(37.557192)
                .longitude(126.925381)
                .active(true)
                .build());

        venueRepository.save(VenueEntity.builder()
                .venueName("안펫나 수원시청점")
                .address("수원 팔달구 효원로 241")
                .phone("031-000-0004")
                .latitude(37.263476)
                .longitude(127.028646)
                .active(true)
                .build());

        venueRepository.save(VenueEntity.builder()
                .venueName("안펫나 부산해운대점")
                .address("부산 해운대구 중동2로 11")
                .phone("051-000-0005")
                .latitude(35.163131)
                .longitude(129.163511)
                .active(true)
                .build());

    }
}

*/
