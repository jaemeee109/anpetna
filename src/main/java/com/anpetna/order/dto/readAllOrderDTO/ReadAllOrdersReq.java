package com.anpetna.order.dto.readAllOrderDTO;

import com.anpetna.member.domain.MemberEntity;
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
    @Builder.Default
    private int page = 0;        // 페이지 번호 (기본 0)

    @Min(1) @Max(100)
    @Builder.Default
    private int size = 10;       // 페이지 크기 (기본 10)

    @Builder.Default
    private String sortBy = "ordersId";        // 정렬 기준 필드

    @Builder.Default
    private String sortDir = "DESC";           // 정렬 방향 (내림차순)


}
