package com.anpetna.venue.dto.doctor;

import lombok.*;
import java.util.List;


// 의사 목록 응답용 DTO

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ListDoctorsRes {
    private List<DoctorDTO> items; // 의사 목록
}