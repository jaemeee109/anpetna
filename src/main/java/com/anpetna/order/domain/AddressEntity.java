package com.anpetna.order.domain;

import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.validation.constraints.Size;
import lombok.*;


@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddressEntity {

    private String zipcode;   // 우편번호

    private String street;    // 도로명/지번

    private String detail;    // 상세주소

    private String receiver;  // 수령인

    @Size(max = 20)
    private String phone;     // 연락처

}
