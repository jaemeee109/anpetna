package com.anpetna.venue.service;

import com.anpetna.core.coreDto.PageRequestDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.venue.dto.member.MyReservationRow;

public interface MemberReservationService {
    PageResponseDTO<MyReservationRow> listMyReservations(String memberId, PageRequestDTO req);
}
