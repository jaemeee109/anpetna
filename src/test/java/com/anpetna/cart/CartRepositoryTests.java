package com.anpetna.cart;

import com.anpetna.cart.domain.CartEntity;
import com.anpetna.cart.repository.CartRepository;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.constant.ItemSellStatus;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.constant.MemberRole;
import org.hibernate.Hibernate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class CartRepositoryTests {

    @Autowired
    CartRepository cartRepository;
    @Autowired
    TestEntityManager em;

    private MemberEntity member;

    private ItemEntity item;

    private CartEntity cart;

    @BeforeEach
    void setUp() {

        member = new MemberEntity();
        member.setMemberId("user01");
        member.setMemberPw("pw");
        member.setMemberName("홍길동");
        member.setMemberBirthY("1990");
        member.setMemberBirthM("01");
        member.setMemberBirthD("01");
        member.setMemberBirthGM("01");
        member.setMemberGender("M");
        member.setMemberHasPet("N");
        member.setMemberPhone("010-0000-0000");
        member.setSmsStsYn("Y");
        member.setMemberEmail("user01@test.com");
        member.setEmailStsYn("Y");
        member.setMemberRoadAddress("Seoul-ro 1");
        member.setMemberZipCode("12345");
        member.setMemberDetailAddress("101-1001");
        member.setMemberRole(MemberRole.USER);
        member.setMemberSocial(false);
        member.setMemberEtc(null);
        em.persist(member);

        item = new ItemEntity();
        item.setItemName("테스트상품");
        item.setItemPrice(10000);
        item.setItemStock(5);
        item.setItemDetail("상세설명");
        item.setItemSellStatus(1);
        item.setItemSaleStatus(30);
        item.setItemCategory(ItemCategory.FEED);
      //  item.setItemThumbsId("thumb-1");
        em.persist(item);

        cart = new CartEntity();
        cart.setMember(member);
        cart.setItem(item);
        cart.setQuantity(2);
        em.persist(cart);

        em.flush();
        em.clear();
    }

    @Test
    @DisplayName("특정 회원(member.memberId)과 상품(item.itemId)으로 장바구니 행을 조회했을 때, 원하는 엔티티가 정확히 반환되는지 검증")
    void findByMemberAndItem_returnsRow() {
        // when
        Optional<CartEntity> found =
                cartRepository.findByMember_MemberIdAndItem_ItemId("user01", item.getItemId());

        // then
        assertThat(found).isPresent();
        CartEntity c = found.orElseThrow();
        assertThat(c.getQuantity()).isEqualTo(2);
        assertThat(c.getMember().getMemberId()).isEqualTo("user01");
        assertThat(c.getItem().getItemId()).isEqualTo(item.getItemId());
    }

    @Test
    @DisplayName("레포지토리 메서드가 item을 fetch join으로 함께 로딩하는지 검증")
    void findAllWithItemByMemberId_fetchJoinsItem() {
        // when
        List<CartEntity> list = cartRepository.findAllWithItemByMemberId("user01");

        // then
        assertThat(list).hasSize(1);
        CartEntity c = list.get(0);

        // 이 쿼리는 item을 fetch join 하도록 설계 -> 즉시 초기화 검증
        assertThat(Hibernate.isInitialized(c.getItem())).isTrue();

        // member는 fetch join 대상이 아닐 수도 있으므로 강한 단정은 하지 않는다(존재만 확인)
        assertThat(c.getMember()).isNotNull();
    }

    @Test
    @DisplayName(" 레포지토리 findPageWithFetchJoinByMemberId() 메서드가 페이징을 유지하면서 item과 member를 fetch join으로 즉시 로딩하는지 검증")
    void findPageWithFetchJoinByMemberId_fetchJoinsItemAndMember_andPaginates() {
        // when
        Page<CartEntity> page = cartRepository.findPageWithFetchJoinByMemberId(
                "user01",
                PageRequest.of(0, 10, Sort.by("cartId").ascending())
        );

        // then
        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent()).hasSize(1);

        CartEntity c = page.getContent().get(0);
        // 이 쿼리는 item, member 모두 fetch join 되도록 설계
        assertThat(Hibernate.isInitialized(c.getItem())).isTrue();
        assertThat(Hibernate.isInitialized(c.getMember())).isTrue();
    }
}
