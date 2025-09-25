package com.anpetna.venue.service.hospital;

import com.anpetna.venue.dto.hospital.CreateHospitalReservationReq;
import com.anpetna.venue.dto.hospital.CreateHospitalReservationRes;
import com.anpetna.venue.dto.doctor.ListDoctorsRes;

public interface HospitalService {
    ListDoctorsRes listDoctors(Long venueId);
    CreateHospitalReservationRes reserve(String memberId, Long venueId, CreateHospitalReservationReq req);
    void confirm(Long reservationId); // 관리자 확정
    void markNoShow(Long reservationId);
}