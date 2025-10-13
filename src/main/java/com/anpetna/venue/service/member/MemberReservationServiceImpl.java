package com.anpetna.venue.service.member;

import com.anpetna.core.coreDto.PageRequestDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.notification.feature.reservation.service.hospital.HospitalCancelNotificationService;
import com.anpetna.notification.feature.reservation.service.hotel.HotelCancelNotificationService;
import com.anpetna.venue.domain.hotel.HotelReservationEntity;
import com.anpetna.venue.domain.hospital.HospitalReservationEntity;
import com.anpetna.venue.dto.member.MyHospitalReservationDetail;
import com.anpetna.venue.dto.member.MyHotelReservationDetail;
import com.anpetna.venue.dto.member.MyReservationRow;
import com.anpetna.venue.repository.hotel.HotelReservationRepository;
import com.anpetna.venue.repository.hospital.HospitalReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;


// 회원용 병원 & 호텔 예약 ' 목록 / 상세 / 취소' 구현

@Service
@RequiredArgsConstructor
@Transactional
public class MemberReservationServiceImpl implements MemberReservationService {

    private final HospitalReservationRepository hospitalRepo;
    private final HotelReservationRepository hotelRepo;
    private final HospitalCancelNotificationService hospitalCancelNotification;
    private final HotelCancelNotificationService hotelCancelNotification;

    
    //  예약 목록
    @Override
    public PageResponseDTO<MyReservationRow> listMyReservations(String memberId, PageRequestDTO req) {
       
        //  병원
        List<MyReservationRow> all = new ArrayList<>();
        for (HospitalReservationEntity e : hospitalRepo.findAll()) {
            MemberEntity m = e.getMember();
            if (m != null && memberId.equals(m.getMemberId())) {
                all.add(MyReservationRow.builder()
                        .reservationId(e.getReservationId())
                        .venueName(e.getVenue() != null ? e.getVenue().getVenueName() : null)
                        .type("HOSPITAL")
                        .status(e.getStatus())
                        .appointmentAt(e.getAppointmentAt())
                        .build());
            }
        }

        //  호텔
        for (HotelReservationEntity e : hotelRepo.findAll()) {
            MemberEntity m = e.getMember();
            if (m != null && memberId.equals(m.getMemberId())) {
                all.add(MyReservationRow.builder()
                        .reservationId(e.getReservationId())
                        .venueName(e.getVenue() != null ? e.getVenue().getVenueName() : null)
                        .type("HOTEL")
                        .status(e.getStatus())
                        .checkIn(e.getCheckIn())
                        .checkOut(e.getCheckOut())
                        .build());

            }
        }

        //  정렬: 가장 최근(날짜/시간) 기준 내림차순
        all.sort(Comparator.<MyReservationRow>comparingLong(r -> {
            if ("HOSPITAL".equals(r.getType()) && r.getAppointmentAt() != null) {
                return r.getAppointmentAt().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli();
            }
            if ("HOTEL".equals(r.getType()) && r.getCheckIn() != null) {
                return r.getCheckIn().atStartOfDay(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli();
            }
            return Long.MIN_VALUE;
        }).reversed());

        //  페이징
        int page = Math.max(1, req.getPage());
        int size = Math.max(1, req.getSize());
        int fromIdx = (page - 1) * size;
        int toIdx = Math.min(all.size(), fromIdx + size);
        List<MyReservationRow> slice = fromIdx >= all.size() ? List.of() : all.subList(fromIdx, toIdx);

        return PageResponseDTO.<MyReservationRow>withAll()
                .pageRequestDTO(req)
                .dtoList(slice)
                .total(all.size())
                .build();
    } // listMyReservations 종료


    // 병원 예약 상세
    @Override
    public MyHospitalReservationDetail readHospital(String memberId, Long reservationId) {
        var e = hospitalRepo.findById(reservationId).orElseThrow();
        if (e.getMember() == null || !memberId.equals(e.getMember().getMemberId())) {
            throw new RuntimeException("NOT_YOUR_RESERVATION");
        }
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
    } // readHospital 종료

    // 호텔 예약 상세
    @Override
    public MyHotelReservationDetail readHotel(String memberId, Long reservationId) {
        var e = hotelRepo.findById(reservationId).orElseThrow();
        if (e.getMember() == null || !memberId.equals(e.getMember().getMemberId())) {
            throw new RuntimeException("NOT_YOUR_RESERVATION");
        }
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
    } // readHotel 종료

    
    // 병원 예약 취소
    @Override
    public void cancelHospital(String memberId, Long reservationId) {
        var e = hospitalRepo.findById(reservationId).orElseThrow();
        if (e.getMember() == null || !memberId.equals(e.getMember().getMemberId())) {
            throw new RuntimeException("NOT_YOUR_RESERVATION");
        }
        e.setStatus(com.anpetna.venue.constant.ReservationStatus.CANCELED);
        hospitalRepo.saveAndFlush(e);

        // ============ 병원 예약 취소 알림 ============
        hospitalCancelNotification.notifyHospitalCancel(
                e.getMember(),
                e.getMember().getMemberId(),
                e.getVenue(),
                e.getAppointmentAt()
        );
        // ===========================================
    } // cancelHospital 종료

    // 호텔 예약 취소
    @Override
    public void cancelHotel(String memberId, Long reservationId) {
        var e = hotelRepo.findById(reservationId).orElseThrow();
        if (e.getMember() == null || !memberId.equals(e.getMember().getMemberId())) {
            throw new RuntimeException("NOT_YOUR_RESERVATION");
        }
        e.setStatus(com.anpetna.venue.constant.ReservationStatus.CANCELED);
        hotelRepo.saveAndFlush(e);

        // ============ 호텔 예약 취소 알림 ============
        hotelCancelNotification.notifyHotelCancel(
                e.getMember(),
                e.getMember().getMemberId(),
                e.getVenue(),
                e.getCheckIn(),
                e.getCheckOut()
        );
        // ==========================================
    } // cancelHotel 종료

}
