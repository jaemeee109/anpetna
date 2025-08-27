package com.anpetna.order;

import com.anpetna.item.domain.ItemEntity;
import com.anpetna.order.domain.OrderEntity;
import com.anpetna.order.domain.OrdersEntity;
import com.anpetna.order.repository.OrderRepository;
import com.anpetna.order.repository.OrdersRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.extern.log4j.Log4j2;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Commit;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigInteger;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // 실제 DB 사용
@TestPropertySource(properties = {
        "spring.jpa.hibernate.ddl-auto=none",            // 테스트 중 DDL 금지
        "spring.jpa.properties.hibernate.hbm2ddl.auto=none"
})
@Transactional
@Log4j2
class OrdersRepositoryTest {

    @Autowired
    OrderRepository orderRepository;

    @Autowired
    OrdersRepository ordersRepository;

    @PersistenceContext EntityManager em;

    /* ===================== 실DB 아이템 로드 유틸 ===================== */

    /** anpetna_item에서 임의의 한 건 item_id를 집어온다(최소 1건 존재해야 함) */
    private Long pickExistingItemId() {
        Object r = em.createNativeQuery(
                "SELECT item_id FROM anpetna_item ORDER BY item_id LIMIT 1"
        ).getSingleResult();

        if (r == null) {
            throw new IllegalStateException("anpetna_item 테이블에 데이터가 없습니다. 최소 1건을 넣고 다시 실행하세요.");
        }
        if (r instanceof Number n) return n.longValue();
        if (r instanceof BigInteger bi) return bi.longValue();
        return Long.parseLong(String.valueOf(r));
    }

    /** 실제 DB의 ItemEntity 한 건을 영속 상태로 로드 */
    private ItemEntity loadExistingItem() {
        Long id = pickExistingItemId();
        ItemEntity item = em.find(ItemEntity.class, id);
        if (item == null) {
            throw new IllegalStateException("item_id=" + id + " 를 ItemEntity로 로드하지 못했습니다.");
        }
        log.info("실제 DB 아이템 로드: id={}, name={}", id, item.getItemName());
        return item;
    }

    /* ===================== 주문 헤더 생성 ===================== */

    private OrdersEntity createAndPersistOrders() {
        OrdersEntity orders = OrdersEntity.builder()
                .memberId("user-001")
                .cardId("CARD-XYZ-001")
                .totalAmount(0)
                .build();

        log.info("==============================================");
        log.info("주문서 : {}", orders);
        log.info("==============================================");
        return ordersRepository.save(orders);
    }

    /* ===================== 테스트 ===================== */

    @Test
    @DisplayName("ordersId로 OrderEntity 조회 (실DB 아이템 사용)")
    @Commit
    void findByOrders_OrdersId() {
        // given
        ItemEntity item = loadExistingItem();         // ★ 새로 INSERT 하지 않음
        OrdersEntity orders = createAndPersistOrders();

        OrderEntity orderItem = OrderEntity.builder()
                .orders(orders)
                .itemEntity(item)
                .price(7000)
                .quantity(2)
                .build();
        orderRepository.save(orderItem);

        // when
        List<OrderEntity> found = orderRepository.findByOrders_OrdersId(orders.getOrdersId());

        // then
        assertThat(found).isNotEmpty();
        assertThat(found.get(0).getOrders().getOrdersId()).isEqualTo(orders.getOrdersId());
        assertThat(found.get(0).getItemEntity().getItemId()).isEqualTo(item.getItemId());

        log.info("==============================================");
        log.info("findByOrders_OrdersId : {}", found);
        log.info("==============================================");
    }

    @Test
    @DisplayName("ordersId로 OrderEntity 삭제 (실DB 아이템 사용)")
    @Commit
    void deleteByOrders_OrdersId() {
        // given
        OrdersEntity orders = createAndPersistOrders();
        ItemEntity item = loadExistingItem();         // ★ 실DB에서 로드

        OrderEntity order1 = OrderEntity.builder()
                .orders(orders).itemEntity(item).price(5000).quantity(1)
                .build();
        OrderEntity order2 = OrderEntity.builder()
                .orders(orders).itemEntity(item).price(8000).quantity(3)
                .build();
        orderRepository.save(order1);
        orderRepository.save(order2);

        log.info("==============================================");
        log.info("save : {}", order1);
        log.info("save : {}", order2);
        log.info("==============================================");

        // when
        orderRepository.deleteByOrders_OrdersId(orders.getOrdersId());

        // then
        List<OrderEntity> after = orderRepository.findByOrders_OrdersId(orders.getOrdersId());
        assertThat(after).isEmpty();

        log.info("==============================================");
        log.info("deleteByOrders_OrdersId : {}", after);
        log.info("==============================================");
    }
}
// -------------------------------------------------------

//package com.anpetna.Order;
//
//import com.anpetna.item.constant.ItemCategory;
//import com.anpetna.item.constant.ItemSellStatus;
//import com.anpetna.item.domain.ItemEntity;
//import com.anpetna.order.domain.OrderEntity;
//import com.anpetna.order.domain.OrdersEntity;
//import com.anpetna.order.repository.OrderRepository;
//import com.anpetna.order.repository.OrdersRepository;
//import jakarta.persistence.PersistenceContext;
//import lombok.extern.log4j.Log4j2;
//import org.junit.jupiter.api.DisplayName;
//import org.junit.jupiter.api.Test;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.boot.test.context.SpringBootTest;
//
//import jakarta.persistence.EntityManager;
//import org.springframework.test.annotation.Commit;
//import org.springframework.transaction.annotation.Transactional;
//
//import java.util.List;
//
//import static org.assertj.core.api.Assertions.assertThat;
//
//
//@SpringBootTest
//@Transactional
//@Log4j2
//class OrdersRepositoryTest {
//
//    @Autowired
//    OrderRepository orderRepository;
//    @Autowired
//    OrdersRepository ordersRepository;
//
//    @PersistenceContext
//    EntityManager em;
//
//    private ItemEntity createAndPersistItem() {
//
//        ItemSellStatus sellStatus = ItemSellStatus.SELL;
//        ItemCategory category = ItemCategory.TOY;
//
//        ItemEntity item = ItemEntity.builder()
//                .itemName("테스트 상품2")
//                .itemPrice(7000)
//                .itemStock(9992)
//                .itemDetail("테스트 상품 상세2")
//                .itemSellStatus(ItemSellStatus.SELL)
//                .itemCategory(ItemCategory.TOY)
//                // .itemSaleStatus(ItemSaleStatus.values()[0]) // 필요하면 주석 해제
//                .build();
//
//        log.info("==============================================");
//        log.info("추가된 아이템 목록 : " + item);
//        log.info("==============================================");
//
//        em.persist(item);
//        em.flush();
//        return item;
//    }
//
//    private OrdersEntity createAndPersistOrders() {
//        OrdersEntity orders = OrdersEntity.builder()
//                .memberId("user-001")
//                .cardId("CARD-XYZ-001")   // 문자열이므로 엔티티 불필요
//                .totalAmount(0)           // 초기 0, 아이템 가격 합산은 선택
//                .build();
//
//        log.info("==============================================");
//        log.info("주문서 : " + orders);
//        log.info("==============================================");
//        return ordersRepository.save(orders);
//    }
//
//    @Test
//    @DisplayName("ordersId로 OrderEntity 조회")
//    @Commit
//    void findByOrders_OrdersId() {
//        // given
//        ItemEntity item = createAndPersistItem();
//        OrdersEntity orders = createAndPersistOrders();
//
//        OrderEntity orderItem = OrderEntity.builder()
//                .orders(orders)         // NOT NULL
//                .itemEntity(item)       // NOT NULL
//                .price(7000)            // NOT NULL
//                .quantity(2)            // NOT NULL
//                .build();
//        orderRepository.save(orderItem);
//
//        // when
//        List<OrderEntity> found = orderRepository.findByOrders_OrdersId(orders.getOrdersId());
//
//        // then
//        assertThat(found).isNotEmpty();
//        assertThat(found.get(0).getOrders().getOrdersId()).isEqualTo(orders.getOrdersId());
//        assertThat(found.get(0).getItemEntity().getItemId()).isEqualTo(item.getItemId());
//
//        log.info("==============================================");
//        log.info("findByOrders_OrdersId : " + found);
//        log.info("==============================================");
//
//    }
//
//    @Test
//    @DisplayName("ordersId로 OrderEntity 삭제")
//    @Commit
//    void deleteByOrders_OrdersId() {
//        // given
//        OrdersEntity orders = createAndPersistOrders();
//        ItemEntity item = createAndPersistItem();
//
//        OrderEntity order1 = OrderEntity.builder()
//                .orders(orders).itemEntity(item).price(5000).quantity(1)
//                .build();
//        OrderEntity order2 = OrderEntity.builder()
//                .orders(orders).itemEntity(item).price(8000).quantity(3)
//                .build();
//        orderRepository.save(order1);
//        orderRepository.save(order2);
//
//        log.info("==============================================");
//        log.info("save : " + order1);
//        log.info("save : " + order2);
//        log.info("==============================================");
//
//        // when
//        orderRepository.deleteByOrders_OrdersId(orders.getOrdersId());
//
//        // then
//        List<OrderEntity> after = orderRepository.findByOrders_OrdersId(orders.getOrdersId());
//        assertThat(after).isEmpty();
//
//        log.info("==============================================");
//        log.info("deleteByOrders_OrdersId : " + after);
//        log.info("==============================================");
//    }
//}