package com.anpetna.Order;


import com.anpetna.order.domain.OrdersEntity;
import com.anpetna.order.repository.OrderRepository;
import com.anpetna.order.repository.OrdersRepository;
import jakarta.persistence.EntityManager;
import lombok.extern.log4j.Log4j2;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Log4j2
@Rollback(false)
@Transactional
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // 교체 금지
public class OrderRepositoryTest {

    @Autowired
    OrdersRepository ordersRepository;

    @Autowired
    OrderRepository orderRepository;

    @Autowired
    EntityManager em;

    // 테스트용 회원 생성 ====================================================================
    private void memberCreate(String memberId) {
        var found = em.find(com.anpetna.member.domain.MemberEntity.class, memberId);
        if (found != null) return;

        var m = new com.anpetna.member.domain.MemberEntity();
        // ⚠️ MemberEntity의 nullable=false 필드는 전부 채워야 저장이 성공함 (엔티티 수정 불가 조건)
        m.setMemberId(memberId);
        m.setMemberPw("pw-" + memberId);
        m.setMemberName("테스트회원-" + memberId);
        m.setMemberBirthY("1995");
        m.setMemberBirthM("08");
        m.setMemberBirthD("19");
        m.setMemberBirthGM("S");
        m.setMemberGender("M");
        m.setMemberHasPet("N");
        m.setMemberPhone("010-0000-0000");

        // 추가 not-null 필드
        m.setSmsStsYn("N");
        m.setMemberEmail(memberId + "@test.com");
        m.setEmailStsYn("N");
        m.setMemberRoadAddress("서울시 테스트로 1");
        m.setMemberZipCode("00000");
        m.setMemberDetailAddress("테스트빌딩 1층");
        m.setMemberRole(com.anpetna.member.constant.MemberRole.USER);

        em.persist(m);
    }

    // ====================================================================
    // 회원을 선행 생성한 뒤 간단히 OrdersEntity를 만들어 반환
    private OrdersEntity newOrders(String memberId, String cardId, int totalAmount) {
        memberCreate(memberId); // 회원 보장
        return OrdersEntity.builder()
                .memberId(memberId)
                .cardId(cardId)
                .totalAmount(totalAmount)
                .build();
    }

    // ====================================================================
    //           CRUD


    @Test
        //CREATE + READ: 주문 저장 후 findByOrdersId 로  조회
    void create_and_read_by_id() {
        // given: 주문 1건 저장
        OrdersEntity saved = ordersRepository.save(newOrders("userA", "CARD-1111", 15000));

        // when: PK로 단건 조회
        Optional<OrdersEntity> found = ordersRepository.findByOrdersId(saved.getOrdersId());

        // then: 저장한 값과 동일한지 검증
        assertThat(found).isPresent();
        OrdersEntity o = found.get();
        assertThat(o.getOrdersId()).isEqualTo(saved.getOrdersId());
        assertThat(o.getMemberId()).isEqualTo("userA");
        assertThat(o.getCardId()).isEqualTo("CARD-1111");
        assertThat(o.getTotalAmount()).isEqualTo(15000);
    }

    @Test
        // UPDATE: 카드/총액 수정 후 재조회 시 변경 내용이 반영되는지 검증
    void update_then_read() {
        // given: 주문 1건 저장
        OrdersEntity saved = ordersRepository.save(newOrders("userA", "CARD-1111", 15000));

        // when: 카드/총액 수정 후 save (더티체킹 또는 save로 업데이트)
        saved.setCardId("CARD-2222");
        saved.setTotalAmount(27500);
        OrdersEntity updated = ordersRepository.save(saved);

        // then: 재조회 시 수정 값이 반영됐는지 확인
        OrdersEntity found = ordersRepository.findByOrdersId(updated.getOrdersId()).orElseThrow();
        assertThat(found.getCardId()).isEqualTo("CARD-2222");
        assertThat(found.getTotalAmount()).isEqualTo(27500);
    }

    @Test
        //DELETE: 품목(Order) 삭제 후 주문 헤더(Orders) 삭제 (서비스 로직 순서 반영)
    void delete_header_and_lines() {
        // given: 주문 1건 저장
        OrdersEntity saved = ordersRepository.save(newOrders("userA", "CARD-1111", 15000));
        Long id = saved.getOrdersId();

        // when:
        // 1) 라인아이템(품목) 먼저 삭제 (실제 품목이 없더라도 메서드 호출은 안전)
        orderRepository.deleteByOrders_OrdersId(id);
        // 2) 주문 헤더 삭제
        ordersRepository.deleteById(id);

        // then: 주문이 삭제되었는지 확인
        assertThat(ordersRepository.findById(id)).isEmpty();
    }

    // ====================================================================
    //          페이징

    @BeforeEach
    void setUpMembers() {
        // 페이징/정렬 검증 전에 userA/userB가 반드시 존재하도록 보장
        memberCreate("userA");
        memberCreate("userB");
    }

    @Test
        // PAGING: 회원별 주문 목록 조회 + 총건수/총페이지/사이즈/정렬 검증")
    void page_by_member() {
        // given: userA 3건, userB 1건
        ordersRepository.save(newOrders("userA", "CARD-1111", 10000));
        ordersRepository.save(newOrders("userA", "CARD-2222", 20000));
        ordersRepository.save(newOrders("userA", "CARD-3333", 30000));
        ordersRepository.save(newOrders("userB", "CARD-9999", 9999));

        // 첫 페이지(0), 사이즈 2, ordersId 내림차순
        Pageable pageable = PageRequest.of(0, 2, Sort.by(Sort.Direction.DESC, "ordersId"));

        // when: 회원별 페이징 조회
        Page<OrdersEntity> page = ordersRepository.findByMemberId("userA", pageable);

        // then: 총건수/총페이지/페이지 사이즈/컨텐츠 크기 검증
    }

}
