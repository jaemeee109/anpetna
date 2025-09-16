package com.anpetna.config;

import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.constant.ItemSellStatus;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.repository.ItemRepository;
import com.anpetna.member.constant.MemberRole;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;

import com.anpetna.order.constant.OrdersStatus;
import com.anpetna.order.domain.OrdersEntity;
import com.anpetna.order.domain.OrderEntity;
import com.anpetna.order.repository.OrdersRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Configuration
@Profile("local")
@RequiredArgsConstructor
public class LocalTestDataSeeder {

    private final MemberRepository memberRepository;
    private final ItemRepository itemRepository;
    private final OrdersRepository ordersRepository;

    @Value("${app.seed.fresh:false}")
    private boolean fresh;

    private static final String SEED_MEMBER_ID = "test02";
    private static final String SEED_ITEM_NAME = "테스트2";

    @Bean
    CommandLineRunner seedRunner() {
        return args -> seedOnce();
    }

    @Transactional
    public void seedOnce() {
        MemberEntity member = upsertMember();
        ItemEntity item = upsertItem();
        createOrderWithOneLine(member, item);
    }

    private MemberEntity upsertMember() {
        Optional<MemberEntity> existingOpt = findMemberById(SEED_MEMBER_ID);
        if (fresh && existingOpt.isPresent()) {
            existingOpt = Optional.empty();
        }

        MemberEntity m = existingOpt.orElseGet(MemberEntity::new);
        m.setMemberId(SEED_MEMBER_ID); // PK(문자열)
        m.setMemberPw("1234");
        m.setMemberName("테스터");
        m.setMemberBirthY("1990");
        m.setMemberBirthM("01");
        m.setMemberBirthD("01");
        m.setMemberBirthGM("M");
        m.setMemberGender("남자");
        m.setMemberHasPet("Y");
        m.setMemberPhone("01012345678");
        m.setSmsStsYn("N");
        m.setMemberEmail("test01@anpetna.com");
        m.setEmailStsYn("Y");
        m.setMemberRoadAddress("서울시 강남구 테스터로 123");
        m.setMemberZipCode("12345");
        m.setMemberDetailAddress("101동 1001호");
        m.setMemberRole(MemberRole.USER);

        return memberRepository.save(m);
    }

    private ItemEntity upsertItem() {
        Optional<ItemEntity> existingOpt = findItemByName(SEED_ITEM_NAME);
        if (fresh && existingOpt.isPresent()) {
            existingOpt = Optional.empty();
        }

        ItemEntity i = existingOpt.orElseGet(ItemEntity::new);
        i.setItemCategory(ItemCategory.FEED);
        i.setItemName(existingOpt.isPresent() ? SEED_ITEM_NAME : withSuffix(SEED_ITEM_NAME));
        i.setItemDetail("테스트 상품 상세입니다.");
        i.setItemPrice(100);           // 결제 최소금액 충족
        i.setItemSaleStatus(10);
        i.setItemSellStatus(ItemSellStatus.SELL);
        i.setItemStock(100);

        return itemRepository.save(i);
    }

    private void createOrderWithOneLine(MemberEntity member, ItemEntity item) {
        OrdersEntity orders = new OrdersEntity();

        // ✅ 필수 NOT NULL 컬럼들 모두 채우기
        orders.setMemberId(member);                 // FK (컬럼: orders_memberId)
        orders.setStatus(OrdersStatus.PENDING);     // 상태
        orders.setOrdersThumbnail("/static/img/sample.png"); // NOT NULL

        // 라인 1건
        OrderEntity oi = new OrderEntity();
        oi.setItem(item);
        oi.setQuantity(1);
        oi.setPrice(item.getItemPrice());          // 라인 합계로 사용 중이면 그대로 OK
        oi.setOrders(orders);
        orders.getOrderItems().add(oi);

        // 🟡 헤더 집계 필드 계산 (모두 NOT NULL)
        int totalQty = oi.getQuantity();                   // 라인 수량 합
        int shippingFee = 0;                               // 필요하면 바꿔도 됨
        int linesTotal = oi.getPrice();                    // 라인 합계(여러 라인이면 합산)

        orders.setItemQuantity(totalQty);                  // orders_itemQuantity
        orders.setShippingFee(shippingFee);                // orders_shippingFee
        orders.setTotalAmount(linesTotal + shippingFee);   // orders_totalAmount
        orders.setCardId("SEED-CARD");                     // orders_cardId (임시 값)

        ordersRepository.save(orders);
        System.out.println("[seed] 주문 생성 완료. ordersId=" + safeOrdersId(orders));
    }

    // ---------- helpers ----------

    private String withSuffix(String base) {
        String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("MMddHHmmss"));
        return base + "-" + ts;
    }

    private Optional<MemberEntity> findMemberById(String memberId) {
        try {
            return memberRepository.findById(memberId);
        } catch (Exception ignore) {
            return memberRepository.findAll().stream().findFirst();
        }
    }

    private Optional<ItemEntity> findItemByName(String name) {
        try {
            // 레포에 findByItemName 이 있으면 여기로 교체
            // return itemRepository.findByItemName(name);
        } catch (Exception ignore) {}
        return Optional.empty();
    }

    private Object safeOrdersId(OrdersEntity orders) {
        try { return orders.getOrdersId(); }
        catch (Exception e) { return String.valueOf(orders); }
    }
}
