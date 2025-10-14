package com.anpetna.venue.service.hotel;


import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;

import com.anpetna.notification.feature.reservation.service.ReservationReminderService;
import com.anpetna.notification.feature.reservation.service.hotel.HotelCancelNotificationService;
import com.anpetna.notification.feature.reservation.service.hotel.HotelNoShowNotificationService;
import com.anpetna.notification.feature.reservation.service.hotel.HotelReservationConfirmNotificationService;
import com.anpetna.notification.feature.reservation.service.hotel.HotelReservationService;
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
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import com.anpetna.venue.dto.member.MyHotelReservationDetail;


// 호텔 예약 구현
@Service
@RequiredArgsConstructor
public class HotelServiceImpl implements HotelService {

    private static final int CAPACITY = 15; // 매장당 1일 15마리 제한
    private static final int NOSHOW_LIMIT = 3; // 노쇼 3회 이상 차단

    private final VenueRepository venueRepository;
    private final MemberRepository memberRepository;
    private final HotelReservationRepository hotelReservationRepository;
    private final HospitalReservationRepository hospitalReservationRepository;

    // ================== 알림 ==================
    private final HotelReservationConfirmNotificationService hotelReservationNotificationService;
    private final HotelNoShowNotificationService hotelNoShowNotification;
    private final HotelReservationService hotelReservationService;
    private final ReservationReminderService reservationReminderService;
    // ==========================================

    private static final LocalTime DEFAULT_CHECKIN_TIME = LocalTime.of(14, 0);
    private static final DateTimeFormatter HOTEL_FMT = DateTimeFormatter.ofPattern("MM월 dd일 HH:mm");
    private final HotelCancelNotificationService hotelCancelNotificationService;


    // 회원의 노쇼 누적 회수( 호텔+병원 합산 )
    private long getNoShowCountAllServices(String memberId) {
        long h = hotelReservationRepository.countByMember_MemberIdAndStatus(memberId, ReservationStatus.NOSHOW);
        long c = hospitalReservationRepository.countByMember_MemberIdAndStatus(memberId, ReservationStatus.NOSHOW);
        return h + c;
    } // getNoShowCountAllServices 종료


    // 예약 생성
    @Override
    @Transactional
    public CreateHotelReservationRes reserve(String memberId, Long venueId, CreateHotelReservationReq req) {

        // 검증: 로그인, 노쇼 누적 제한
        if (memberId == null || memberId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        // 예약 차단 : 노쇼 3회 이상이면 호텔·병원 전체 예약 불가
        if (getNoShowCountAllServices(memberId) >= NOSHOW_LIMIT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "노쇼 3회 이상으로 예약이 제한되었습니다.");
        }

        // 매장, 회원 조회
        VenueEntity venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "장소(Venue)를 찾을 수 없습니다."));

        MemberEntity member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        // 날짜 검증
        LocalDate today   = LocalDate.now();
        LocalDate checkIn = req.getCheckIn();
        LocalDate checkOut = req.getCheckOut();


        if (checkIn == null || checkOut == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "입실일/퇴실일이 없습니다.");
        }
        if (checkIn.isBefore(today)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "과거 날짜에는 예약할 수 없습니다.");
        }
        if (!checkOut.isAfter(checkIn)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "퇴실일은 입실일 다음날 이후여야 합니다.");
        }

        if (checkOut.isBefore(checkIn)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "checkOut은 checkIn 이후여야 합니다.");
        }

        // 수용 정원 체크
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

        // 예약 엔티티 저장
        HotelReservationEntity saved = hotelReservationRepository.save(
                HotelReservationEntity.builder()
                        .venue(venue)
                        .member(member)
                        .checkIn(checkIn)
                        .checkOut(checkOut)
                        .status(ReservationStatus.PENDING)
                        .reserverName(req.getReserverName())
                        .primaryPhone(req.getPrimaryPhone())
                        .secondaryPhone(req.getSecondaryPhone())
                        .petName(req.getPetName())
                        .petBirthYear(req.getPetBirthYear())
                        .memo(req.getMemo())
                        .build()
        );

        // =============== 예약 생성 알림 ===============
        hotelReservationService.notifyHotelReservation(member, memberId, venue, checkIn, checkOut);
        // ============================================

        return CreateHotelReservationRes.builder()
                .reservationId(saved.getReservationId())
                .build();
    } // reserve 종료


    // 예약 확정
    @Override
    public void confirm(Long reservationId) {

        // 예약 검증
        HotelReservationEntity found = hotelReservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "예약을 찾을 수 없습니다."));

        // 예약 상태 변경
        found.setStatus(ReservationStatus.CONFIRMED);


        // =============== 예약 확정 알림 ===============
        hotelReservationNotificationService.notifyHotelReservationConfirm(
                found.getMember(),
                found.getMember().getMemberId(),
                found.getVenue(),
                found.getCheckIn(),
                found.getCheckOut()
        );


        //  리마인드 알림 스케줄 등록 (24h/3h)
        // checkIn(LocalDate) + 기본 체크인 시각(LocalTime) → LocalDateTime 환산은 내부 서비스에서 수행
        String title24h = "[호텔 체크인 D-1] 내일 " +
                (found.getVenue() != null ? found.getVenue().getVenueName() : "") + " " +
                found.getCheckIn().atTime(DEFAULT_CHECKIN_TIME).format(HOTEL_FMT) +
                " 체크인 예정입니다. 필요 시 일정 변경을 진행해 주세요.";

        String title3h = "[호텔 체크인 임박] " +
                found.getCheckIn().atTime(DEFAULT_CHECKIN_TIME).format(DateTimeFormatter.ofPattern("HH:mm")) +
                " 체크인 3시간 전입니다. 안전하게 방문해 주세요.";

        // ============================================


        reservationReminderService.handleHotelStatusChange(
                String.valueOf(found.getReservationId()),
                found.getMember().getMemberId(),
                found.getCheckIn(),                // LocalDate
                DEFAULT_CHECKIN_TIME,             // LocalTime (기본 14:00)
                ReservationStatus.CONFIRMED,
                title24h, title3h
        );

    } // confirm 종료

    //  관리자: 노쇼 처리 API
    @Override
    public void markNoShow(Long reservationId) {

        // 예약 검증
        HotelReservationEntity found = hotelReservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "예약을 찾을 수 없습니다."));
        // 예약상태 변경
        found.setStatus(ReservationStatus.NOSHOW);


        // =========== 노쇼 알림 ===========
        hotelNoShowNotification.notifyHotelNoShow(
                found.getMember(),
                found.getMember().getMemberId(),
                found.getVenue(),
                found.getCheckIn(),
                found.getCheckOut()
        );

        //  리마인드 잡 전부 취소
        reservationReminderService.handleHotelStatusChange(
                String.valueOf(found.getReservationId()),
                found.getMember().getMemberId(),
                found.getCheckIn(),
                DEFAULT_CHECKIN_TIME,
                ReservationStatus.NOSHOW,
                null, null
        );
        // ================================

    } // markNoShow 종료
    // 관리자용 리스트
    @Transactional(readOnly = true)
    @Override
    public List<AdminHotelReservationRow> adminList(Long venueId, String status, String memberId) {
        ReservationStatus statusEnum = null;
        if (status != null && !status.isBlank()) {
            try { statusEnum = ReservationStatus.valueOf(status.trim().toUpperCase()); }
            catch (IllegalArgumentException ignored) {}
        }

        List<HotelReservationEntity> all =
                hotelReservationRepository.findAll();
        List<AdminHotelReservationRow> rows = new ArrayList<>();

        // 매장 필터
        for (HotelReservationEntity r : all) {
            if (venueId != null) {
                if (r.getVenue() == null || r.getVenue().getVenueId() == null || !r.getVenue().getVenueId().equals(venueId)) {
                    continue;
                }
            }
            // 상태 필터
            if (statusEnum != null && r.getStatus() != statusEnum) continue;
            // 회원ID 필터
            if (memberId != null) {
                if (r.getMember() == null || r.getMember().getMemberId() == null || !r.getMember().getMemberId().equals(memberId)) {
                    continue;
                }
            }

            // DTO로 반환
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
    } // adminList 종료


    // 관리자용 예약상태 변경
    @Transactional
    @Override
    public boolean tryUpdateStatus(Long reservationId, String nextStatus) {

        if (reservationId == null || nextStatus == null) return false;
        final ReservationStatus next;
        try {
            next = ReservationStatus.valueOf(nextStatus.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return false;
        }

        var opt = hotelReservationRepository.findById(reservationId);
        if (opt.isEmpty()) return false;
        var r = opt.get();
        r.setStatus(next);

        // ================= 알림 =================

        var member = r.getMember();
        var venue = r.getVenue();
        var checkIn = r.getCheckIn();
        var checkOut = r.getCheckOut();
        String memberId = (member != null ? member.getMemberId() : null);

        if (member != null && memberId != null && venue != null && checkIn != null && checkOut != null) {
            switch (next) {
                case CONFIRMED -> hotelReservationNotificationService.notifyHotelReservationConfirm(
                        member, memberId, venue, checkIn, checkOut
                );
                case NOSHOW -> hotelNoShowNotification.notifyHotelNoShow(
                        member, memberId, venue, checkIn, checkOut
                );
                case CANCELED -> hotelCancelNotificationService.notifyHotelCancel(
                        member, memberId, venue, checkIn, checkOut
                );
                default -> { /* PENDING 등은 알림 없음 */ }
            }
        }

        // 상태 전이 후 리마인드 스케줄 조정
        if (next == ReservationStatus.CONFIRMED) {
            String title24h = "[호텔 체크인 D-1] 내일 " +
                    (r.getVenue() != null ? r.getVenue().getVenueName() : "") + " " +
                    r.getCheckIn().atTime(DEFAULT_CHECKIN_TIME).format(HOTEL_FMT) +
                    " 체크인 예정입니다. 필요 시 일정 변경을 진행해 주세요.";

            String title3h = "[호텔 체크인 임박] " +
                    r.getCheckIn().atTime(DEFAULT_CHECKIN_TIME).format(DateTimeFormatter.ofPattern("HH:mm")) +
                    " 체크인 3시간 전입니다. 안전하게 방문해 주세요.";

            reservationReminderService.handleHotelStatusChange(
                    String.valueOf(r.getReservationId()),
                    r.getMember() != null ? r.getMember().getMemberId() : null,
                    r.getCheckIn(),
                    DEFAULT_CHECKIN_TIME,
                    ReservationStatus.CONFIRMED,
                    title24h, title3h
            );
        } else if (next == ReservationStatus.CANCELED
                || next == ReservationStatus.NOSHOW
                || next == ReservationStatus.REJECTED) {

            reservationReminderService.handleHotelStatusChange(
                    String.valueOf(r.getReservationId()),
                    r.getMember() != null ? r.getMember().getMemberId() : null,
                    r.getCheckIn(),
                    DEFAULT_CHECKIN_TIME,
                    next,
                    null, null
            );
            // ======================================
        }

        return true;

    } // tryUpdateStatus 종료


    // 관리자용 상세 조회
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
    }// adminReadDetail 종료



} // HotelServiceImpl Class 종료
