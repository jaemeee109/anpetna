package com.anpetna.order.domain;

import jakarta.persistence.Embeddable;
<<<<<<< HEAD
=======
import jakarta.validation.constraints.Size;
>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
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

<<<<<<< HEAD
=======
    @Size(max = 20)
    private String phone;     // 연락처

>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
}
