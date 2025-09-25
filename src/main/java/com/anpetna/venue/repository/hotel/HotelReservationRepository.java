package com.anpetna.venue.repository.hotel;

import com.anpetna.venue.constant.ReservationStatus;
import com.anpetna.venue.domain.hotel.HotelReservationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface HotelReservationRepository extends JpaRepository<HotelReservationEntity, Long> {

    /** [정원 체크] 기간 겹치는 예약 수(확정+대기) 체크해서 방지 */
    @Query("""
        select count(hr) from HotelReservationEntity hr
         where hr.venue.venueId = :venueId
           and hr.status in (:s1, :s2)
           and hr.checkIn <= :endDate
           and hr.checkOut >= :startDate
    """)
    long countOverlapping(Long venueId,
                          java.time.LocalDate startDate,
                          java.time.LocalDate endDate,
                          ReservationStatus s1,
                          ReservationStatus s2);

    /** 특정 회원의 노쇼 건수 */
    long countByMember_MemberIdAndStatus(String memberId, ReservationStatus status);
}
