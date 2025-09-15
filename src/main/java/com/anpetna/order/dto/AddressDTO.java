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

<<<<<<< HEAD
=======
    private String phone; // 연락처

>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
}
