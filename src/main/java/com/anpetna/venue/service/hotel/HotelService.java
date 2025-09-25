package com.anpetna.venue.service.hotel;


import com.anpetna.venue.dto.hotel.CreateHotelReservationReq;
import com.anpetna.venue.dto.hotel.CreateHotelReservationRes;

public interface HotelService {
    CreateHotelReservationRes reserve(String memberId, Long venueId, CreateHotelReservationReq req);
    void confirm(Long reservationId); // 관리자 확정
    void markNoShow(Long reservationId);
}
