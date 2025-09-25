package com.anpetna.venue.dto.doctor;


import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DoctorDTO {
    private Long doctorId;
    private String name;
}