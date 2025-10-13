package com.anpetna.venue.dto.hospital;

import lombok.*;
import java.util.List;

// 선택한 날짜와 의사를 기준으로 예약할 수 없는 시간 슬롯 목록

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UnavailableTimesRes {

    private List<String> times;  // "HH:mm" 형식의 30분 단위 슬롯 목록
}
