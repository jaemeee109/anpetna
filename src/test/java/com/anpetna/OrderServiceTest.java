package com.anpetna;

import com.anpetna.order.domain.OrderEntity;
import com.anpetna.order.repository.OrderRepository;
import com.anpetna.order.service.OrderServiceImpl;
import lombok.extern.log4j.Log4j2;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.stereotype.Service;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@SpringBootTest
@Log4j2
@Rollback(false)
@Transactional
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // 교체 금지
public class OrderServiceTest {


    @Mock
    OrderRepository orderRepository;

    @InjectMocks
    OrderServiceImpl orderService;

    @Test
    @DisplayName("getByOrdersId: 정상 - 리포지토리 결과 반환")
    void getByOrdersId_ok() {
        Long ordersId = 10L;
        OrderEntity e1 = OrderEntity.builder().orderId(1L).build();
        OrderEntity e2 = OrderEntity.builder().orderId(2L).build();
        when(orderRepository.findByOrders_OrdersId(ordersId))
                .thenReturn(List.of(e1, e2));

        List<OrderEntity> result = orderService.getByOrdersId(ordersId);

        assertThat(result).containsExactly(e1, e2);
        verify(orderRepository).findByOrders_OrdersId(ordersId);
        verifyNoMoreInteractions(orderRepository);
    }

    @Test
    @DisplayName("getByOrdersId: null 파라미터면 IllegalArgumentException")
    void getByOrdersId_null_throws() {
        assertThatThrownBy(() -> orderService.getByOrdersId(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ordersId");
        verifyNoInteractions(orderRepository);
    }

    @Test
    @DisplayName("deleteByOrdersId: 정상 - 리포지토리 호출됨")
    void deleteByOrdersId_ok() {
        Long ordersId = 1L;

        orderService.deleteByOrdersId(ordersId);

        verify(orderRepository).deleteByOrders_OrdersId(ordersId);
        verifyNoMoreInteractions(orderRepository);
    }

    @Test
    @DisplayName("deleteByOrdersId: null 파라미터면 IllegalArgumentException")
    void deleteByOrdersId_null_throws() {
        assertThatThrownBy(() -> orderService.deleteByOrdersId(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ordersId");
        verifyNoInteractions(orderRepository);
    }
}
