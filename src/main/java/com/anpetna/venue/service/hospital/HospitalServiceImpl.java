package com.anpetna.venue.service.hospital;


import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;
import com.anpetna.notification.feature.reservation.service.ReservationReminderService;
import com.anpetna.notification.feature.reservation.service.hospital.HospitalCancelNotificationService;
import com.anpetna.notification.feature.reservation.service.hospital.HospitalNoShowNotificationService;
import com.anpetna.notification.feature.reservation.service.hospital.HospitalReservationConfirmNotificationService;
import com.anpetna.notification.feature.reservation.service.hospital.HospitalReservationService;
import com.anpetna.venue.constant.ReservationStatus;
import com.anpetna.venue.domain.hospital.HospitalReservationEntity;
import com.anpetna.venue.domain.hospital.VenueDoctorEntity;
import com.anpetna.venue.domain.VenueEntity;
import com.anpetna.venue.dto.hospital.CreateHospitalReservationReq;
import com.anpetna.venue.dto.hospital.CreateHospitalReservationRes;
import com.anpetna.venue.dto.doctor.DoctorDTO;
import com.anpetna.venue.dto.doctor.ListDoctorsRes;
import com.anpetna.venue.repository.hospital.HospitalReservationRepository;
import com.anpetna.venue.repository.hospital.VenueDoctorRepository;
import com.anpetna.venue.repository.VenueRepository;
import com.anpetna.venue.repository.hotel.HotelReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.anpetna.venue.dto.member.MyHospitalReservationDetail;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;


// 병원 예약 구현

@Service
@RequiredArgsConstructor
public class HospitalServiceImpl implements HospitalService {

    private static final int NOSHOW_LIMIT = 3; // 노쇼 3회 이상 차단

    private final VenueRepository venueRepository;
    private final MemberRepository memberRepository;
    private final VenueDoctorRepository doctorRepository;
    private final HospitalReservationRepository hospitalReservationRepository;
    private final HotelReservationRepository hotelReservationRepository;

    // ========== 알림 서비스 ==========
    private final HospitalReservationConfirmNotificationService hospitalReservationNotificationService;
    private final HospitalNoShowNotificationService hospitalNoShowNotification;
    private final HospitalReservationService hospitalReservationService;
    private final ReservationReminderService reservationReminderService;
    private static final DateTimeFormatter H_FMT = DateTimeFormatter.ofPattern("MM월 dd일 HH:mm");
    private final HospitalCancelNotificationService hospitalCancelNotificationService;
    // ================================

    // 회원의 노쇼 누적 회수 (호텔 + 병원 합산)
    private long getNoShowCountAllServices(String memberId) {
        long c = hospitalReservationRepository.countByMember_MemberIdAndStatus(memberId, ReservationStatus.NOSHOW);
        long h = hotelReservationRepository.countByMember_MemberIdAndStatus(memberId, ReservationStatus.NOSHOW);
        return h + c;
    } // getNoShowCountAllServices 종료

    // 의사 목록 조회 (active=true)
    @Override
    @Transactional(readOnly = true)
    public ListDoctorsRes listDoctors(Long venueId) {
        var items = doctorRepository.findByVenue_VenueIdAndActiveTrue(venueId).stream()
                .map(d -> DoctorDTO.builder().doctorId(d.getDoctorId()).name(d.getName()).build())
                .collect(Collectors.toList());
        return ListDoctorsRes.builder().items(items).build();
    } // listDoctors 종료

    // 예약 생성
    @Override
    @Transactional
    public CreateHospitalReservationRes reserve(String memberId, Long venueId, CreateHospitalReservationReq req) {
        // 로그인, 노쇼 누적 제한 체크
        if (memberId == null || memberId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        // 예약 차단 : 노쇼 3회 이상이면 호텔·병원 전체 예약 불가
        if (getNoShowCountAllServices(memberId) >= NOSHOW_LIMIT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "노쇼 3회 이상으로 예약이 제한되었습니다.");
        }

        // 엔티티 조회 ( 매장, 회원, 의사)
        VenueEntity venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "장소(Venue)를 찾을 수 없습니다."));
        MemberEntity member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
        VenueDoctorEntity doctor = doctorRepository.findById(req.getDoctorId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "의사를 찾을 수 없습니다."));


        // 의사 유효성 검증
        if (!doctor.isActive() || !doctor.getVenue().getVenueId().equals(venueId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "해당 매장의 의사가 아닙니다.");
        }

        // 날짜/시간 검증 추가 (Null, 과거시간 예약 금지)
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime at = req.getAppointmentAt();
        if (at == null || at.isBefore(now)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "과거 시각에는 예약할 수 없습니다."
            );
        }
        //  30분 단위 슬롯/영업시간 검증
        int hour = at.getHour();
        int minute = at.getMinute();
        if (!((hour >= 10 && hour < 18) && (hour < 13 || hour >= 14) && (minute == 0 || minute == 30))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "예약 가능 시간은 10~18시(13~14 제외) 30분 단위입니다.");
        }

        // 중복 예약 방지
        if (hospitalReservationRepository.existsByDoctor_DoctorIdAndAppointmentAt(doctor.getDoctorId(), at)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "해당 시간은 이미 예약되었습니다.");
        }

        // 예약 저장
        HospitalReservationEntity saved = hospitalReservationRepository.save(
                HospitalReservationEntity.builder()
                        .venue(venue)
                        .member(member)
                        .doctor(doctor)
                        .appointmentAt(at)
                        .status(ReservationStatus.PENDING)
                        .reserverName(req.getReserverName())
                        .primaryPhone(req.getPrimaryPhone())
                        .secondaryPhone(req.getSecondaryPhone())
                        .petName(req.getPetName())
                        .petBirthYear(req.getPetBirthYear())
                        .petSpecies(req.getPetSpecies())
                        .petGender(req.getPetGender())
                        .memo(req.getMemo())
                        .build()
        );

        //============ 예약 생성 알림 (예약 생성 시 사용자에게 안내) ============
        hospitalReservationService.notifyHospitalReservation(member, memberId, venue, at);
        //=================================================================
        // 예약 번호 반환
        return CreateHospitalReservationRes.builder().reservationId(saved.getReservationId()).build();
    } // reserve 종료


    // 예약 확정
    @Override
    public void confirm(Long reservationId) {
        // 예약 확인
        HospitalReservationEntity found = hospitalReservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "예약을 찾을 수 없습니다."));
        // 예약 상태 변경
        found.setStatus(ReservationStatus.CONFIRMED);

        // =================예약 확정 알림 =================
        hospitalReservationNotificationService.notifyHospitalReservationConfirm(
                found.getMember(),
                found.getMember().getMemberId(),
                found.getVenue(),
                found.getAppointmentAt()
        );

        //  리마인드 알림 스케줄 등록 (24h/3h)
        String title24h = "[병원 예약 D-1] 내일 " +
                (found.getDoctor() != null ? found.getDoctor().getName() : "") + "/" +
                (found.getVenue() != null ? found.getVenue().getVenueName() : "") + " " +
                found.getAppointmentAt().format(H_FMT) + " 방문 예정입니다.";
        String title3h = "[병원 예약 임박] " +
                found.getAppointmentAt().format(DateTimeFormatter.ofPattern("HH:mm")) +
                " 예약 3시간 전입니다. 10분 전 도착 부탁드립니다.";

        reservationReminderService.handleHospitalStatusChange(
                String.valueOf(found.getReservationId()),
                found.getMember().getMemberId(),
                found.getAppointmentAt(),
                ReservationStatus.CONFIRMED,
                title24h, title3h
        );
        // ============================================

    } // confirm 종료

    // 관리자: 노쇼 처리 API
    @Override
    public void markNoShow(Long reservationId) {

        // 예약 확인
        HospitalReservationEntity found = hospitalReservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "예약을 찾을 수 없습니다."));
        // 예약 상태 변경
        found.setStatus(ReservationStatus.NOSHOW);

        // =================예약 노쇼 알림 =================
        hospitalNoShowNotification.notifyHospitalNoShow(
                found.getMember(),
                found.getMember().getMemberId(),
                found.getVenue(),
                found.getAppointmentAt()
        );

        // 리마인드 잡 전부 취소
        reservationReminderService.handleHospitalStatusChange(
                String.valueOf(found.getReservationId()),
                found.getMember().getMemberId(),
                found.getAppointmentAt(),
                ReservationStatus.NOSHOW,
                null, null
        );
        // ===============================================

    } // markNoShow 종료

    // 관리자용 리스트 조회
    @Transactional(readOnly = true)
    @Override
    public List<AdminHospitalReservationRow> adminList(Long venueId, String status, String memberId) {

        ReservationStatus statusEnum = null;
        if (status != null && !status.isBlank()) {
            try { statusEnum = ReservationStatus.valueOf(status.trim().toUpperCase()); }
            catch (IllegalArgumentException ignored) {}
        }

        List<HospitalReservationEntity> all =
                hospitalReservationRepository.findAll();
        List<AdminHospitalReservationRow> rows = new ArrayList<>();

        // 매장번호 필터
        for (HospitalReservationEntity r : all) {
            if (venueId != null) {
                if (r.getVenue() == null || r.getVenue().getVenueId() == null || !r.getVenue().getVenueId().equals(venueId)) {
                    continue;
                }
            }
            // 예약 상태 필터
            if (statusEnum != null && r.getStatus() != statusEnum) continue;
            // 회원id 필터
            if (memberId != null) {
                if (r.getMember() == null || r.getMember().getMemberId() == null || !r.getMember().getMemberId().equals(memberId)) {
                    continue;
                }
            }

            // 화면에 필요한 정보 DTO 반환
            rows.add(AdminHospitalReservationRow.builder()
                    .reservationId(r.getReservationId())
                    .status(r.getStatus())
                    .venueName(r.getVenue() != null ? r.getVenue().getVenueName() : null)
                    .memberId(r.getMember() != null ? r.getMember().getMemberId() : null)
                    .reserverName(r.getReserverName())
                    .petName(r.getPetName())
                    .primaryPhone(r.getPrimaryPhone())
                    .doctorId(r.getDoctor() != null ? r.getDoctor().getDoctorId() : null)
                    .doctorName(r.getDoctor() != null ? r.getDoctor().getName() : null)
                    .appointmentAt(r.getAppointmentAt())
                    .createdAt(r.getCreateDate())
                    .build());
        }
        return rows;
    } // adminList 종료


    // 관리자용 예약 상태 변경
    @Transactional
    @Override
    public boolean tryUpdateStatus(Long reservationId, String nextStatus) {
        if (reservationId == null || nextStatus == null) return false;
        final com.anpetna.venue.constant.ReservationStatus next;
        try {
            next = com.anpetna.venue.constant.ReservationStatus.valueOf(nextStatus.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return false;
        }

        var opt = hospitalReservationRepository.findById(reservationId);
        if (opt.isEmpty()) return false;
        var r = opt.get();
        r.setStatus(next); // JPA dirty checking

        // ===================== 상태 변경 알림 ==========================

        var member = r.getMember();
        var venue  = r.getVenue();
        var at     = r.getAppointmentAt();
        String memberId = (member != null ? member.getMemberId() : null);

        if (member != null && memberId != null && venue != null && at != null) {
            switch (next) {
                case CONFIRMED -> hospitalReservationNotificationService.notifyHospitalReservationConfirm(
                        member, memberId, venue, at
                );
                case NOSHOW -> hospitalNoShowNotification.notifyHospitalNoShow(
                        member, memberId, venue, at
                );
                case CANCELED -> hospitalCancelNotificationService.notifyHospitalCancel(
                        member, memberId, venue, at
                );
                default -> { /* PENDING 등은 알림 없음 */ }
            }
        }

        // 상태 전이 후 리마인드 스케줄 조정
        if (next == ReservationStatus.CONFIRMED) {
            String title24h = "[병원 예약 D-1] 내일 " +
                    (r.getDoctor() != null ? r.getDoctor().getName() : "") + "/" +
                    (r.getVenue() != null ? r.getVenue().getVenueName() : "") + " " +
                    r.getAppointmentAt().format(H_FMT) + " 방문 예정입니다.";
            String title3h = "[병원 예약 임박] " +
                    r.getAppointmentAt().format(DateTimeFormatter.ofPattern("HH:mm")) +
                    " 예약 3시간 전입니다. 10분 전 도착 부탁드립니다.";

            reservationReminderService.handleHospitalStatusChange(
                    String.valueOf(r.getReservationId()),
                    r.getMember() != null ? r.getMember().getMemberId() : null,
                    r.getAppointmentAt(),
                    ReservationStatus.CONFIRMED,
                    title24h, title3h
            );
        } else if (next == ReservationStatus.CANCELED
                || next == ReservationStatus.NOSHOW
                || next == ReservationStatus.REJECTED) {
            reservationReminderService.handleHospitalStatusChange(
                    String.valueOf(r.getReservationId()),
                    r.getMember() != null ? r.getMember().getMemberId() : null,
                    r.getAppointmentAt(),
                    next,
                    null, null
            );

            // ==========================================================
        }

        return true;

    } // tryUpdateStatus 종료


    // 관리자 상세 조회 (DTO로 매핑하여 반환)
    @Transactional(readOnly = true)
    @Override
    public MyHospitalReservationDetail adminReadDetail(Long reservationId) {

        var e = hospitalReservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "예약을 찾을 수 없습니다."));

        return MyHospitalReservationDetail.builder()
                .reservationId(e.getReservationId())
                .venueName(e.getVenue() != null ? e.getVenue().getVenueName() : "")
                .service("HOSPITAL")
                .status(e.getStatus())
                .appointmentAt(e.getAppointmentAt())
                .doctorName(e.getDoctor() != null ? e.getDoctor().getName() : null)
                .reserverName(e.getReserverName())
                .primaryPhone(e.getPrimaryPhone())
                .secondaryPhone(e.getSecondaryPhone())
                .petName(e.getPetName())
                .petBirthYear(e.getPetBirthYear())
                .petSpecies(e.getPetSpecies())
                .petGender(e.getPetGender())
                .memo(e.getMemo())
                .build();
    } // adminReadDetail 종료



} // HospitalServiceImpl Class 종료
