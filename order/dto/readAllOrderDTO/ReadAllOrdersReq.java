package com.anpetna.order.dto.readAllOrderDTO;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReadAllOrdersReq {


    @NotBlank
    private String memberId;     // 조회할 회원 ID

    @Min(0)
    private int page = 0;        // 페이지 번호 (기본 0)

    @Min(1) @Max(100)
    private int size = 10;       // 페이지 크기 (기본 10)

    private String sortBy = "ordersId";        // 정렬 기준 필드

    private String sortDir = "DESC";           // 정렬 방향 (내림차순)


}
