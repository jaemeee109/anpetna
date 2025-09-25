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

        LocalDate in  = req.getCheckIn();
        LocalDate out = req.getCheckOut();
        if (out.isBefore(in)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "checkOut은 checkIn 이후여야 합니다.");
        }

        // 정원 체크(대기+확정)
        long overlap = hotelReservationRepository.countOverlapping(
                venueId, in, out, ReservationStatus.PENDING, ReservationStatus.CONFIRMED);
        if (overlap >= CAPACITY) {
            // 자동 마감(정원 초과 시 신청 불가)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "정원 15마리 초과로 예약이 마감되었습니다.");
        }

        HotelReservationEntity saved = hotelReservationRepository.save(
                HotelReservationEntity.builder()
                        .venue(venue)
                        .member(member)
                        .checkIn(in)
                        .checkOut(out)
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


}
