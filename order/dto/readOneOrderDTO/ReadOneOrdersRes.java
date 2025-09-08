package com.anpetna.order.dto.readOneOrderDTO;

import com.anpetna.order.dto.OrderDTO;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ReadOneOrdersRes {

    private Long ordersId;

    private String memberId;

    private String cardId;

    private int totalAmount;

    private String thumbnailUrl;

    private List<OrderDTO> ordersItems;

}