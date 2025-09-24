package com.anpetna.venue.dto.create;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

/** 예약 생성 요청 바디 DTO */
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class CreateVenueReservationReq {

    @NotNull
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") // ISO-8601 형식으로 받기 (예: 2025-09-23T21:00:00)
    private LocalDateTime reservedAt;

    @Size(max = 500)
    private String memo;
}
