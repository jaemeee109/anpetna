package com.anpetna.venue.service.hospital;


import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;
import com.anpetna.venue.constant.ReservationStatus;
import com.anpetna.venue.domain.hospital.HospitalReservationEntity;
import com.anpetna.venue.domain.VenueDoctorEntity;
import com.anpetna.venue.domain.VenueEntity;
import com.anpetna.venue.dto.hospital.CreateHospitalReservationReq;
import com.anpetna.venue.dto.hospital.CreateHospitalReservationRes;
import com.anpetna.venue.dto.doctor.DoctorDTO;
import com.anpetna.venue.dto.doctor.ListDoctorsRes;
import com.anpetna.venue.repository.hospital.HospitalReservationRepository;
import com.anpetna.venue.repository.VenueDoctorRepository;
import com.anpetna.venue.repository.VenueRepository;
import com.anpetna.venue.repository.hotel.HotelReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.anpetna.venue.dto.member.MyHospitalReservationDetail;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HospitalServiceImpl implements HospitalService {

    private static final int NOSHOW_LIMIT = 3; // 노쇼 3회 이상 차단

    private final VenueRepository venueRepository;
    private final MemberRepository memberRepository;
    private final VenueDoctorRepository doctorRepository;
    private final HospitalReservationRepository hospitalReservationRepository;
    private final HotelReservationRepository hotelReservationRepository;

    // 회원의 노쇼 누적 회수(호텔+병원 합산)
    private long getNoShowCountAllServices(String memberId) {
        long c = hospitalReservationRepository.countByMember_MemberIdAndStatus(memberId, ReservationStatus.NOSHOW);
        long h = hotelReservationRepository.countByMember_MemberIdAndStatus(memberId, ReservationStatus.NOSHOW);
        return h + c;
    }

    @Override
    @Transactional(readOnly = true)
    public ListDoctorsRes listDoctors(Long venueId) {
        var items = doctorRepository.findByVenue_VenueIdAndActiveTrue(venueId).stream()
                .map(d -> DoctorDTO.builder().doctorId(d.getDoctorId()).name(d.getName()).build())
                .collect(Collectors.toList());
        return ListDoctorsRes.builder().items(items).build();
    }

    @Override
    @Transactional
    public CreateHospitalReservationRes reserve(String memberId, Long venueId, CreateHospitalReservationReq req) {
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
        VenueDoctorEntity doctor = doctorRepository.findById(req.getDoctorId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "의사를 찾을 수 없습니다."));

        if (!doctor.isActive() || !doctor.getVenue().getVenueId().equals(venueId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "해당 매장의 의사가 아닙니다.");
        }

        // ====== 날짜/시간 검증 추가 (Null, 과거 금지) ======
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime at = req.getAppointmentAt();
        if (at == null || at.isBefore(now)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "과거 시각에는 예약할 수 없습니다."
            );
        }
        // ====== 30분 슬롯/영업시간 검증 ======
        int hour = at.getHour();
        int minute = at.getMinute();
        if (!((hour >= 10 && hour < 18) && (hour < 13 || hour >= 14) && (minute == 0 || minute == 30))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "예약 가능 시간은 10~18시(13~14 제외) 30분 단위입니다.");
        }

        if (hospitalReservationRepository.existsByDoctor_DoctorIdAndAppointmentAt(doctor.getDoctorId(), at)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "해당 시간은 이미 예약되었습니다.");
        }

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

        return CreateHospitalReservationRes.builder().reservationId(saved.getReservationId()).build();
    }


    @Override
    @Transactional
    public void confirm(Long reservationId) {
        HospitalReservationEntity found = hospitalReservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "예약을 찾을 수 없습니다."));
        found.setStatus(ReservationStatus.CONFIRMED);
    }

    // 관리자: 노쇼 처리 API
    @Override
    @Transactional
    public void markNoShow(Long reservationId) {
        HospitalReservationEntity found = hospitalReservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "예약을 찾을 수 없습니다."));
        found.setStatus(ReservationStatus.NOSHOW);
    }
    @Transactional(readOnly = true)
    @Override
    public List<AdminHospitalReservationRow> adminList(Long venueId, String status, String memberId) {
        com.anpetna.venue.constant.ReservationStatus statusEnum = null;
        if (status != null && !status.isBlank()) {
            try { statusEnum = com.anpetna.venue.constant.ReservationStatus.valueOf(status.trim().toUpperCase()); }
            catch (IllegalArgumentException ignored) {}
        }

        java.util.List<com.anpetna.venue.domain.hospital.HospitalReservationEntity> all =
                hospitalReservationRepository.findAll();
        java.util.List<AdminHospitalReservationRow> rows = new java.util.ArrayList<>();

        for (com.anpetna.venue.domain.hospital.HospitalReservationEntity r : all) {
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
    }


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
        return true;
    }

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
    }



}
