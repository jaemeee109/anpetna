package com.anpetna.venue.service.hospital;

import com.anpetna.venue.constant.ReservationStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter @ToString
@Builder @AllArgsConstructor @NoArgsConstructor
public class AdminHospitalReservationRow {
    private Long reservationId;
    private ReservationStatus status;
    private String venueName;
    private String memberId;
    private String reserverName;
    private String petName;
    private String primaryPhone;
    private Long doctorId;
    private String doctorName;
    private LocalDateTime appointmentAt; // 진료일시
    private LocalDateTime createdAt;     // 생성일
}
