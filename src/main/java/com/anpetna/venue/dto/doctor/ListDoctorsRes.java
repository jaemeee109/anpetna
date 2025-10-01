package com.anpetna.venue.dto.doctor;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ListDoctorsRes {
    private List<DoctorDTO> items;
}