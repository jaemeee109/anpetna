package com.anpetna.venue.service.hotel;


import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;

import com.anpetna.venue.constant.ReservationStatus;
import com.anpetna.venue.domain.hotel.HotelReservationEntity;
import com.anpetna.venue.domain.VenueEntity;
import com.anpetna.venue.dto.hotel.CreateHotelReservationReq;
import com.anpetna.venue.dto.hotel.CreateHotelReservationRes;
import com.anpetna.venue.repository.hospital.HospitalReservationRepository;
import com.anpetna.venue.repository.hotel.HotelReservationRepository;
import com.anpetna.venue.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import com.anpetna.venue.dto.member.MyHotelReservationDetail;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class HotelServiceImpl implements HotelService {

    private static final int CAPACITY = 15; // 매장당 동시 수용 정원
    private static final int NOSHOW_LIMIT = 3; // 노쇼 3회 이상 차단

    private final VenueRepository venueRepository;
    private final MemberRepository memberRepository;
    private final HotelReservationRepository hotelReservationRepository;
    private final HospitalReservationRepository hospitalReservationRepository;

    // 회원의 노쇼 누적 회수(호텔+병원 합산)
    private long getNoShowCountAllServices(String memberId) {
        long h = hotelReservationRepository.countByMember_MemberIdAndStatus(memberId, ReservationStatus.NOSHOW);
        long c = hospitalReservationRepository.countByMember_MemberIdAndStatus(memberId, ReservationStatus.NOSHOW);
        return h + c;
    }
    @Override
    @Transactional
    public CreateHotelReservationRes reserve(String memberId, Long venueId, CreateHotelReservationReq req) {

        if (memberId == null || memberId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        // 예약 차단 : 노쇼 3회 이상이면 호텔·병원 전체 예약 불가
        if (getNoShowCountAllServices(memberId) >= NOSHOW_LIMIT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "노쇼 3회 이상으로 예약이 제한되었습니다.");
        }

        VenueEntity venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "장소(Venue)를 찾을 수 없습니다."));

        MemberEntity member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        LocalDate today   = LocalDate.now();
        LocalDate checkIn = req.getCheckIn();
        LocalDate checkOut = req.getCheckOut();

        //  검증: null/과거/퇴실일 관계
        if (checkIn == null || checkOut == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "입실일/퇴실일이 없습니다.");
        }
        if (checkIn.isBefore(today)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "과거 날짜에는 예약할 수 없습니다.");
        }
        if (!checkOut.isAfter(checkIn)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "퇴실일은 입실일 다음날 이후여야 합니다.");
        }
        // (보강) 동일 의미의 중복 방어 — 논리상 위 조건이 true면 여기 오지 않지만, 가독성 유지
        if (checkOut.isBefore(checkIn)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "checkOut은 checkIn 이후여야 합니다.");
        }

        // ★ 정원 체크(대기+확정) — LocalDate 인자 전달
        long overlap = hotelReservationRepository.countOverlapping(
                venueId,
                checkIn,
                checkOut,
                ReservationStatus.PENDING,
                ReservationStatus.CONFIRMED
        ); //  startDate/endDate는 LocalDate. :contentReference[oaicite:1]{index=1}

        if (overlap >= CAPACITY) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "정원 15마리 초과로 예약이 마감되었습니다.");
        }

        HotelReservationEntity saved = hotelReservationRepository.save(
                HotelReservationEntity.builder()
                        .venue(venue)
                        .member(member)
                        .checkIn(checkIn)   //
                        .checkOut(checkOut) //
                        .status(ReservationStatus.PENDING) // 관리자 확정
                        .reserverName(req.getReserverName())
                        .primaryPhone(req.getPrimaryPhone())
                        .secondaryPhone(req.getSecondaryPhone())
                        .petName(req.getPetName())
                        .petBirthYear(req.getPetBirthYear())
                        .memo(req.getMemo())
                        .build()
        );

        return CreateHotelReservationRes.builder()
                .reservationId(saved.getReservationId())
                .build();
    }


    @Override
    @Transactional
    public void confirm(Long reservationId) {
        HotelReservationEntity found = hotelReservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "예약을 찾을 수 없습니다."));
        found.setStatus(ReservationStatus.CONFIRMED);
        // JPA dirty checking
    }

    //  관리자: 노쇼 처리 API
    @Override
    @Transactional
    public void markNoShow(Long reservationId) {
        HotelReservationEntity found = hotelReservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "예약을 찾을 수 없습니다."));
        found.setStatus(ReservationStatus.NOSHOW);
    }
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @Override
    public java.util.List<AdminHotelReservationRow> adminList(Long venueId, String status, String memberId) {
        com.anpetna.venue.constant.ReservationStatus statusEnum = null;
        if (status != null && !status.isBlank()) {
            try { statusEnum = com.anpetna.venue.constant.ReservationStatus.valueOf(status.trim().toUpperCase()); }
            catch (IllegalArgumentException ignored) {}
        }

        java.util.List<com.anpetna.venue.domain.hotel.HotelReservationEntity> all =
                hotelReservationRepository.findAll();
        java.util.List<AdminHotelReservationRow> rows = new java.util.ArrayList<>();

        for (com.anpetna.venue.domain.hotel.HotelReservationEntity r : all) {
            if (venueId != null) {
                if (r.getVenue() == null || r.getVenue().getVenueId() == null || !r.getVenue().getVenueId().equals(venueId)) {
                    continue;
                }
            }
            if (statusEnum != null && r.getStatus() != statusEnum) continue;
            if (memberId != null) {
                if (r.getMember() == null || r.getMember().getMemberId() == null || !r.getMember().getMemberId().equals(memberId)) {
                    continue;
                }
            }

            rows.add(AdminHotelReservationRow.builder()
                    .reservationId(r.getReservationId())
                    .status(r.getStatus())
                    .venueName(r.getVenue() != null ? r.getVenue().getVenueName() : null)
                    .memberId(r.getMember() != null ? r.getMember().getMemberId() : null)
                    .reserverName(r.getReserverName())
                    .petName(r.getPetName())
                    .primaryPhone(r.getPrimaryPhone())
                    .checkIn(r.getCheckIn())
                    .checkOut(r.getCheckOut())
                    .createdAt(r.getCreateDate())
                    .build());
        }
        return rows;
    }


    @org.springframework.transaction.annotation.Transactional
    @Override
    public boolean tryUpdateStatus(Long reservationId, String nextStatus) {
        if (reservationId == null || nextStatus == null) return false;
        final com.anpetna.venue.constant.ReservationStatus next;
        try {
            next = com.anpetna.venue.constant.ReservationStatus.valueOf(nextStatus.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return false;
        }

        var opt = hotelReservationRepository.findById(reservationId);
        if (opt.isEmpty()) return false;
        var r = opt.get();
        r.setStatus(next); // JPA dirty checking
        return true;
    }

    @Transactional(readOnly = true)
    @Override
    public MyHotelReservationDetail adminReadDetail(Long reservationId) {
        var e = hotelReservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "예약을 찾을 수 없습니다."));
        return MyHotelReservationDetail.builder()
                .reservationId(e.getReservationId())
                .venueName(e.getVenue() != null ? e.getVenue().getVenueName() : "")
                .service("HOTEL")
                .status(e.getStatus())
                .checkIn(e.getCheckIn())
                .checkOut(e.getCheckOut())
                .reserverName(e.getReserverName())
                .primaryPhone(e.getPrimaryPhone())
                .secondaryPhone(e.getSecondaryPhone())
                .petName(e.getPetName())
                .petBirthYear(e.getPetBirthYear())
                .memo(e.getMemo())
                .build();
    }



}
