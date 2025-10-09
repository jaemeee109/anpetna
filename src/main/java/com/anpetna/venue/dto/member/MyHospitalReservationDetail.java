package com.anpetna.venue.dto.member;

import com.anpetna.venue.constant.PetGender;
import com.anpetna.venue.constant.ReservationStatus;
import lombok.*;

import java.time.LocalDateTime;

// 병원 예약 폼 데이터보관용
// 예약 상세 페이지 조회

@Getter @Setter @ToString
@Builder @AllArgsConstructor @NoArgsConstructor
public class MyHospitalReservationDetail {


    private Long reservationId; // 예약번호
    private String venueName; // 매장명
    private String service; // 병원 (병원 or 호텔)
    private ReservationStatus status; // 예약상태

    private LocalDateTime appointmentAt; // 예약일시
    private String doctorName; // 의사명

    private String reserverName; // 예약자명
    private String primaryPhone; // 예약자 연락처
    private String secondaryPhone; // 추가 연락처

    private String petName; // 반려동물 이름
    private Integer petBirthYear; // 반려동물 출생연도
    private String petSpecies; // 반려동물 종류
    private PetGender petGender; // 반려동물 성별

    private String memo; // 요청사항(메모)
}
