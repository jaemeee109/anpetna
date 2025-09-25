package com.anpetna.venue.dto.hotel;


import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateHotelReservationReq {

    @NotNull private LocalDate checkIn;     // 포함
    @NotNull private LocalDate checkOut;    // 포함


    @NotBlank @Size(max=50)  private String reserverName;
    @NotBlank @Size(max=30)  private String primaryPhone;
    @Size(max=30)            private String secondaryPhone;

    @NotBlank @Size(max=50)  private String petName;
    @NotNull                 private Integer petBirthYear;

    @Size(max=500)           private String memo;
}