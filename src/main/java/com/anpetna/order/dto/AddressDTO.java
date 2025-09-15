package com.anpetna.order.dto;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddressDTO {

    private String zipcode;   // 우편번호

    private String street;    // 도로명/지번

    private String detail;    // 상세주소

    private String receiver;  // 수령인

    private String phone; // 연락처

}
