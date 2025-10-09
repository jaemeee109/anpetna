package com.anpetna.venue.service.hotel;

import com.anpetna.venue.dto.hotel.CreateHotelReservationReq;
import com.anpetna.venue.dto.hotel.CreateHotelReservationRes;
import java.util.List;
import com.anpetna.venue.dto.member.MyHotelReservationDetail;

// 호텔 예약
public interface HotelService {
   
    // 예약 생성
    CreateHotelReservationRes reserve(String memberId, Long venueId, CreateHotelReservationReq req);
   
    // 관리자 확정
    void confirm(Long reservationId); 
    
    // 노쇼
    void markNoShow(Long reservationId); 

    // 관리자용 리스트
    List<AdminHotelReservationRow> adminList(Long venueId, String status, String memberId);

    // 상태변경
    boolean tryUpdateStatus(Long reservationId, String nextStatus);
  
    // 상세조회
    MyHotelReservationDetail adminReadDetail(Long reservationId);
}
