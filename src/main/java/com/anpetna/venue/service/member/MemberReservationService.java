package com.anpetna.venue.service.member;

import com.anpetna.core.coreDto.PageRequestDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.venue.dto.member.MyHospitalReservationDetail;
import com.anpetna.venue.dto.member.MyHotelReservationDetail;
import com.anpetna.venue.dto.member.MyReservationRow;

// 회원용 병원 & 호텔 예약 ' 목록/ 상세 / 취소'
public interface MemberReservationService {

    PageResponseDTO<MyReservationRow> listMyReservations(String memberId, PageRequestDTO req);

    MyHospitalReservationDetail readHospital(String memberId, Long reservationId);

    MyHotelReservationDetail readHotel(String memberId, Long reservationId);

    void cancelHospital(String memberId, Long reservationId);

    void cancelHotel(String memberId, Long reservationId);

}
