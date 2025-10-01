package com.anpetna.venue.dto.member;

import com.anpetna.venue.constant.PetGender;
import com.anpetna.venue.constant.ReservationStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter @ToString
@Builder @AllArgsConstructor @NoArgsConstructor
public class MyHospitalReservationDetail {
    // 병원 예약 폼 데이터보관용
    private Long reservationId;
    private String venueName;
    private String service; // 병원
    private ReservationStatus status;

    private LocalDateTime appointmentAt;
    private String doctorName;

    private String reserverName;
    private String primaryPhone;
    private String secondaryPhone;

    private String petName;
    private Integer petBirthYear;
    private String petSpecies;
    private PetGender petGender;

    private String memo;
}
