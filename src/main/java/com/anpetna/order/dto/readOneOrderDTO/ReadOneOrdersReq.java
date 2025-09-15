package com.anpetna.order.dto.readOneOrderDTO;


<<<<<<< HEAD
=======
import com.anpetna.member.domain.MemberEntity;
>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReadOneOrdersReq {

    @NotNull
    @Min(1)
    Long ordersId;

    @NotNull
<<<<<<< HEAD
    String memberId;
=======
    MemberEntity memberId;
>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
    // 토큰 사용자와 일치 확인 용도


}
