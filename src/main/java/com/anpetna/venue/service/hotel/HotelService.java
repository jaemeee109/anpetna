package com.anpetna.venue.service.hotel;

import com.anpetna.venue.dto.hotel.CreateHotelReservationReq;
import com.anpetna.venue.dto.hotel.CreateHotelReservationRes;
import java.util.List;
import com.anpetna.venue.dto.member.MyHotelReservationDetail;

public interface HotelService {
    CreateHotelReservationRes reserve(String memberId, Long venueId, CreateHotelReservationReq req);
    void confirm(Long reservationId); // 관리자 확정
    void markNoShow(Long reservationId);

    List<AdminHotelReservationRow> adminList(Long venueId, String status, String memberId);
    boolean tryUpdateStatus(Long reservationId, String nextStatus);
    MyHotelReservationDetail adminReadDetail(Long reservationId);
}
