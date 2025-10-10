package com.anpetna.core.service;

import com.anpetna.core.dto.PageRequestDTO;
import com.anpetna.core.dto.PageResponseDTO;
import com.anpetna.venue.dto.member.MyHospitalReservationDetail;
import com.anpetna.venue.dto.member.MyHotelReservationDetail;
import com.anpetna.venue.dto.member.MyReservationRow;

public interface MemberReservationService {
    PageResponseDTO<MyReservationRow> listMyReservations(String memberId, PageRequestDTO req);
    MyHospitalReservationDetail readHospital(String memberId, Long reservationId);
    MyHotelReservationDetail readHotel(String memberId, Long reservationId);

    void cancelHospital(String memberId, Long reservationId);
    void cancelHotel(String memberId, Long reservationId);
}
