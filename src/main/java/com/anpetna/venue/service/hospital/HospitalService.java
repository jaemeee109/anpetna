package com.anpetna.venue.service.hospital;

import com.anpetna.venue.dto.hospital.CreateHospitalReservationReq;
import com.anpetna.venue.dto.hospital.CreateHospitalReservationRes;
import com.anpetna.venue.dto.doctor.ListDoctorsRes;
import java.util.List;
import com.anpetna.venue.dto.member.MyHospitalReservationDetail;

// 병원 예약
public interface HospitalService {

    // 의사 목록 조회
    ListDoctorsRes listDoctors(Long venueId);

    // 예약 생성
    CreateHospitalReservationRes reserve(String memberId, Long venueId, CreateHospitalReservationReq req);
    // 관리자 확정
    void confirm(Long reservationId);
    // 노쇼
    void markNoShow(Long reservationId);

    // 관리자용 리스트
    List<AdminHospitalReservationRow> adminList(Long venueId, String status, String memberId);

   // 상태변경
    boolean tryUpdateStatus(Long reservationId, String nextStatus);

    // 상세조회
    MyHospitalReservationDetail adminReadDetail(Long reservationId);

}
