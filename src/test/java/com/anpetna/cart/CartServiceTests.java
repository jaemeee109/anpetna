package com.anpetna.cart;

import com.anpetna.cart.domain.CartEntity;
import com.anpetna.cart.dto.addCartItem.AddCartItemReq;
import com.anpetna.cart.dto.addCartItem.AddCartItemRes;
import com.anpetna.cart.dto.cartList.CartListReq;
import com.anpetna.cart.dto.cartList.CartListRes;
import com.anpetna.cart.dto.deleteCartItem.DeleteCartItemReq;
import com.anpetna.cart.dto.deleteCartItem.DeleteCartItemRes;
import com.anpetna.cart.dto.updateCartItemQuantity.UpdateCartItemQuantityReq;
import com.anpetna.cart.dto.updateCartItemQuantity.UpdateCartItemQuantityRes;
import com.anpetna.cart.repository.CartRepository;
import com.anpetna.cart.service.CartServiceImpl;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.dto.ItemDTO;
import com.anpetna.item.repository.ItemRepository;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.assertThat;


@ExtendWith(MockitoExtension.class)
public class CartServiceTests {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private ItemRepository itemRepository;

    @Mock
    private MemberRepository memberRepository;

    @Mock
    ModelMapper modelMapper;

    @InjectMocks    // CartService 객체에 위의 가짜 객체들을 주입해 비즈니스 로직을 테스트한다.
    private CartServiceImpl cartService;

    private MemberEntity member;

    private ItemEntity item;

    @Captor
    private ArgumentCaptor<CartEntity> cartCaptor;

    @BeforeEach // 모든 단위 테스트 실행 전 공통적으로 준비할 값, Mockito 스텁 설정
    void setUp() {
        // 테스트에서 사용할 Entity 생성 == 더미 데이터 생성
        member = new MemberEntity();

        item = new ItemEntity();
    }

    @Test
    @DisplayName("회원이 있고, 상품도 있는데 장바구니에 아직 없을 때 -> addItem()을 호출하면 새 장바구니 항목을 저장하고, 응답에 아이템 정보와 합계 요약이 들어있는지 검증")
    void addItem_success() {
        // given
        // 더미 데이터 회원 ID, 상품 ID
        String memberId = "user01";
        item.setItemId(1L);

        // buildSummary() 메서드는 DB를 통해 장바구니 전체 목록을 조회한다. 테스트에서는 mock을 쓰기 때문에 빈 리스트(List.of())를 반환하도록 설정
        when(modelMapper.map(any(ItemEntity.class), eq(ItemDTO.class)))
                .thenReturn(new ItemDTO());

        // Service에서는 ItemEntity 를 DTO로 변환할 때 ModelMapper를 사용하지만 테스트에서는 ModelMapper도 Mock이므로 어떤 ItemEntity가 들어와도 ItemDTO 하나를 리턴하도록 설정
        // 실제 매핑 로직보다는 테스트 자체가 DTO null 때문에 깨지지 않도록 하기 위한 스텁
        when(cartRepository.findAllWithItemByMemberId(anyString()))
                .thenReturn(List.of());

        // 요청 DTO를 mock하고, 상품 ID "1", 수량 "2"가 들어왔다고 가정
        AddCartItemReq request = mock(AddCartItemReq.class);
        when(request.getItemId()).thenReturn("1");
        when(request.getQuantity()).thenReturn(2);

        // 회원.상품 조회는 정상적으로 존재한다고 스텁
        when(memberRepository.findById(memberId)).thenReturn(Optional.of(member));
        when(itemRepository.findById(1L)).thenReturn(Optional.of(item));
        // 해당 회원의 장바구니에 해당 상품이 아직 없다고 가정 -> 서비스에서 새 CarEntity를 만들어야 한다.
        when(cartRepository.findByMember_MemberIdAndItem_ItemId(memberId, 1L))
                .thenReturn(Optional.empty());
        // save() 호출 시 데이터베이스를 쓰지 않으니 넘겨받은 엔티티를 그대로 반환하도록.
        when(cartRepository.save(any(CartEntity.class)))
                .thenAnswer(i -> i.getArgument(0));

        // when
        // 실제 서비스 메서드 호출. 위 given에 따르면 새 장바구니 행이 만들어지고, 수량 2 로 저장된다.
        AddCartItemRes response = cartService.addItem(memberId, request, "idem-1");

        // then
        // 응답 객체와 내부의 item, summary가 null이 아님을 확인
        assertThat(response).isNotNull();
        assertThat(response.getItem()).isNotNull();
        assertThat(response.getSummary()).isNotNull();
        // cartRepository.save()가 실제로 호출됐는지 검증
        verify(cartRepository).save(any(CartEntity.class));
    }

    @Test
    @DisplayName("정상적으로 장바구니 목록을 페이징 조회하고 요약 정보를 채워 반환하는지 검증.")
    void getCart_success() {
        // given
        // 회원 "user01"이 존재한다고 스텁
        String memberId = "user01";
        when(memberRepository.findById(memberId)).thenReturn(Optional.of(member));

        // 장바구니에 상품 한 건이 들어있다고 가정
        CartEntity cart = new CartEntity();
        cart.setItem(item);

        when(modelMapper.map(any(ItemEntity.class), eq(ItemDTO.class)))
                .thenReturn(new ItemDTO());

        // PageImpl로 한 건짜리 페이지 객체를 생성( 총 요소 1개 )
        Page<CartEntity> page = new PageImpl<>(List.of(cart));
        // 페이징 조회도 fetch join 메서드로 스텁
        when(cartRepository.findPageWithFetchJoinByMemberId(eq(memberId), any(Pageable.class)))
                .thenReturn(page);
        // 요약 계산(fetch join 목록)도 스텁
        when(cartRepository.findAllWithItemByMemberId(memberId))
                .thenReturn(List.of(cart));

        // 오름차순 설정
        CartListReq request = new CartListReq();
        request.setSort("asc");

        // when
        // 서비스 메서드 호출. 회원 확인 -> 페이징 조회(fetch join) -> ItemEntity를 DTO 매핑 -> 요약 곗나 호출
        CartListRes response = cartService.getCart(memberId, request);

        // then
        assertThat(response).isNotNull();
        assertThat(response.getItems()).hasSize(1);
        assertThat(response.getSummary()).isNotNull();
        // 페이지 메타의 totalElements가 1인 것을 확인. (PageImpl 설정대로)
        assertThat(response.getPage().getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("장바구니에 이미 있는 상품의 수량을 요청 값으로 갱신하는지 검증")
    void updateQuantity_success() {
        // given
        // 테스트용 회원.장바구니 행을 생성. 수량은 "1"
        String memberId = "user01";
        CartEntity cart = new CartEntity();
        cart.setItem(item);
        cart.setQuantity(1);

        when(modelMapper.map(any(ItemEntity.class), eq(ItemDTO.class)))
                .thenReturn(new ItemDTO());

        // 회원 "user01"의 itemId=5 상품이 장바구니 항목에 이미 존재한다고 스텁
        when(cartRepository.findByMember_MemberIdAndItem_ItemId(memberId, 5L))
                .thenReturn(Optional.of(cart));
        // save() 호출 시, 데이터베이스를 쓰지 않고 넘겨받은 엔티티 그대로 반환
        when(cartRepository.save(any(CartEntity.class)))
                .thenAnswer(i -> i.getArgument(0));
        // buildSummary()가 합계 계산 시 사용할 전체 장바구니 조회(fetxh join 메서드)를 한 건 반환으로 스텁
        when(cartRepository.findAllWithItemByMemberId(memberId))
                .thenReturn(List.of(cart));

        // 요청 수량을 "10"으로 설정
        UpdateCartItemQuantityReq request = mock(UpdateCartItemQuantityReq.class);
        when(request.getQuantity()).thenReturn(10);

        // when
        // 서비스 메서드 호출. "5"를 5L로 파싱 -> 장바구니 행 조회 -> Math.max(1, 10) 수량 10으로 설정 -> save()로 반영 -> toItemDTO()와 buildSummary() 호출
        UpdateCartItemQuantityRes response = cartService.updateQuantity(memberId, "5", request);

        // then
        assertThat(response).isNotNull();
        assertThat(response.getItem()).isNotNull();
        assertThat(response.getSummary()).isNotNull();
        // 변경된 엔티티가 저장 호출되었고, 최종 수량이 10으로 수정 되었는지 확인
        verify(cartRepository).save(cart);
        assertThat(cart.getQuantity()).isEqualTo(10);
    }

    @Test
    @DisplayName("존재하는 장바구니 항목을 찾아 삭제, 빈 목록을 기반으로 요약을 재계산. 삭제 성곡 응답을 반환하는지 검증")
    void removeItem_success() {
        // given
        // 테스트용 회원.삭제 대상이 될 장바구니 행 생성
        String memberId = "user01";
        CartEntity cart = new CartEntity();

        // 회원 "user01"의 itemId=3 상품의 장바구니 항목이 존재한다고 스텁
        when(cartRepository.findByMember_MemberIdAndItem_ItemId(memberId, 3L))
                .thenReturn(Optional.of(cart));
        // 삭제 후 요약 계산 시 빈 목록 반환
        when(cartRepository.findAllWithItemByMemberId(memberId))
                .thenReturn(List.of());

        // 필드가 없어 단순 마커 용도
        DeleteCartItemReq request = new DeleteCartItemReq();

        // when
        // 문자열 "3"을 3L로 파싱 -> 장바구니 행 조회 -> cartRepository.delete(cart) 호출로 삭제 -> buildSummary()로 요약 재계산 -> removed=true, itemId="3", summary=... 응답
        DeleteCartItemRes response = cartService.removeItem(memberId, "3", request);

        // then
        assertThat(response).isNotNull();
        assertThat(response.isRemoved()).isTrue();
        verify(cartRepository).delete(cart);
    }

}
