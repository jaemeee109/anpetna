package com.anpetna.venue.dto.hospital;


import com.anpetna.venue.constant.PetGender;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateHospitalReservationReq {

    @NotNull private Long doctorId;
    @NotNull private LocalDateTime appointmentAt; // 30분 경계 정렬

    @NotBlank @Size(max=50)  private String reserverName;
    @NotBlank @Size(max=30)  private String primaryPhone;
    @Size(max=30)            private String secondaryPhone;

    @NotBlank @Size(max=50)  private String petName;
    @NotNull                 private Integer petBirthYear;

    @NotBlank @Size(max=50)  private String petSpecies;
    @NotNull                 private PetGender petGender;

    @Size(max=500)           private String memo;
}
