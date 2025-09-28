package com.anpetna.venue.dto.hospital;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UnavailableTimesRes {
    /** "HH:mm" 형식의 30분 단위 슬롯 목록 */
    private List<String> times;
}
