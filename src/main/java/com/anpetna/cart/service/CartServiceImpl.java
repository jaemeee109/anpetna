package com.anpetna.cart.service;

import com.anpetna.cart.domain.CartEntity;
import com.anpetna.cart.dto.CartSummaryDTO;
import com.anpetna.cart.dto.addCartItem.AddCartItemReq;
import com.anpetna.cart.dto.addCartItem.AddCartItemRes;
import com.anpetna.cart.dto.cartList.CartListReq;
import com.anpetna.cart.dto.cartList.CartListRes;
import com.anpetna.cart.dto.deleteCartItem.DeleteCartItemReq;
import com.anpetna.cart.dto.deleteCartItem.DeleteCartItemRes;
import com.anpetna.cart.dto.updateCartItemQuantity.UpdateCartItemQuantityReq;
import com.anpetna.cart.dto.updateCartItemQuantity.UpdateCartItemQuantityRes;
import com.anpetna.cart.repository.CartRepository;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.dto.ItemDTO;
import com.anpetna.item.repository.ItemRepository;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@Service
public class CartServiceImpl implements CartService{

    private final CartRepository cartRepository;

    private final ItemRepository itemRepository;

    private final MemberRepository memberRepository;

    private final ModelMapper modelMapper;

    @Autowired
    public CartServiceImpl(CartRepository cartRepository, ItemRepository itemRepository, MemberRepository memberRepository, ModelMapper modelMapper) {
        this.cartRepository = cartRepository;

        this.itemRepository = itemRepository;

        this.memberRepository = memberRepository;

        this.modelMapper = modelMapper;
    }

    @Override
    public AddCartItemRes addItem(String memberId, AddCartItemReq request, String idempotencyKey) {
        // idemKey 저장 및 중복차단은 로직에서 생략( 추후 캐시/테이블로 확장 )

        // 요청 해원 정보 갖고오기
        MemberEntity member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다. (memberId=" + memberId + ")"));

        // 요청으로 넘어온 상품 정보 갖고오기
        Long itemId = parseItemId(request.getItemId());
        ItemEntity item = itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 상품입니다. (itemId=" + request.getItemId() + ")"));

        // 요청 회원의 장바구니에 요청 상품 항목이 이미 존재하는지 확인하기
        CartEntity cart = cartRepository.findByMember_MemberIdAndItem_ItemId(memberId, itemId)
                .orElseGet(() -> {  // 없다면 새로운 CartEntity를 만들어서 초기 수량은 0으로
                    CartEntity c = new CartEntity();
                    c.setMember(member);
                    c.setItem(item);
                    c.setQuantity(0);
                    return c;
                });

        // 재고 검증 추가
        int reqQty  = Math.max(1, request.getQuantity());
        int curQty  = Math.max(0, cart.getQuantity());
        int wantQty = curQty + reqQty;
        Integer stockVal = item.getItemStock();
        int stock = (stockVal != null) ? Math.max(0, stockVal) : 0;         // 상품 현재 재고

        if (wantQty > stock) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "재고 수량을 초과하여 담을 수 없습니다. (itemId=" + item.getItemId() + ", 요청수량=" + wantQty + ", 현재고=" + stock + ")"
            );
        }

        

        // 장바구니에 담길 수량을 업데이트.
        cart.setQuantity(cart.getQuantity() + Math.max(1, request.getQuantity()));  // 요청 수량이 0 이하일 경우를 방지. 최소 1이상만 받는다.
        cartRepository.save(cart);

        ItemDTO itemDTO = toItemDTO(item); // ItemEntity를 DTO로 변환. 엔티티 노출하지 않기
        CartSummaryDTO summary = buildSummary(memberId);    // 회원 장바구니 전체를 다시 조회.

        return AddCartItemRes.builder()
                .item(itemDTO)
                .summary(summary)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('USER')")
    public CartListRes getCart(String memberId, CartListReq request) {

        // 멤버 존재 보장
        memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다. (memberId=" + memberId + ")"));

        String sortKeyword = request.getSort(); // sort 기본값 : desc
        Sort sort = "asc".equalsIgnoreCase(request.getSort())
                ? Sort.by("cartId").ascending()
                : Sort.by("cartId").descending();

        int page = Objects.requireNonNullElse(request.getPage(), 0);
        int size = Objects.requireNonNullElse(request.getSize(), 20);

        Pageable pageable = PageRequest.of(page, size, sort);
        // fetch join 적용된 페이징 메서드 사용
        Page<CartEntity> cartPage = cartRepository.findPageWithFetchJoinByMemberId(memberId, pageable);

        boolean includeImages = request.isIncludeImages();

        // cartPage 안에 있는 CartEntity 목록을 꺼내 각각의 ItemEntity를 꺼낸 후 ItemDTO로 변환해 리스트에 넣는다.
        List<ItemDTO> items = cartPage.getContent().stream()
                .map(cart -> toItemDTO(cart, includeImages))
                .toList();

        CartSummaryDTO summary = buildSummary(memberId);

        CartListRes.PageDTO pageDTO = CartListRes.PageDTO.builder()
                .page(cartPage.getNumber())
                .size(cartPage.getSize())
                .totalElements(cartPage.getTotalElements())
                .totalPages(cartPage.getTotalPages())
                .sort("asc".equalsIgnoreCase(sortKeyword) ? "asc" : "desc")
                .build();

        return CartListRes.builder()
                .items(items)
                .summary(summary)
                .page(pageDTO)
                .build();
    }

    @Override
    @Transactional
    public UpdateCartItemQuantityRes updateQuantity(String memberId, String itemIdStr, UpdateCartItemQuantityReq request) {

        Long itemId = parseItemId(itemIdStr);

        // 요청 회원과 요청 상품에 맞는 장바구니 항목을 조회.
        CartEntity cart = cartRepository.findByMember_MemberIdAndItem_ItemId(memberId, itemId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND,
                        "장바구니에 해당 상품이 없습니다. (itemId=" + itemIdStr + ")"
                ));

        // 재고 검증 추가
        ItemEntity item = cart.getItem();
        int nextQty = Math.max(1, request.getQuantity());  // 최소 1
        Integer stockVal = item.getItemStock();
        int stock = (stockVal != null) ? Math.max(0, stockVal) : 0;

        if (nextQty > stock) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "재고 수량을 초과하여 변경할 수 없습니다. (itemId=" + item.getItemId() + ", 요청수량=" + nextQty + ", 현재고=" + stock + ")"
            );
        }

        // 요청으로 들어온 수량으로 장바구니 수량을 변경. 최솟값을 1로 강제.
        cart.setQuantity(nextQty);
        cartRepository.save(cart);

        // ItemEntity 를 DTO로 변환
        ItemDTO itemDTO = toItemDTO(cart.getItem());
        CartSummaryDTO summary = buildSummary(memberId);

        return UpdateCartItemQuantityRes.builder()
                .item(itemDTO)
                .summary(summary)
                .build();
    }

    @Override
    public DeleteCartItemRes removeItem(String memberId, String itemIdStr, DeleteCartItemReq request) {

        Long itemId = parseItemId(itemIdStr);

        CartEntity cart = cartRepository.findByMember_MemberIdAndItem_ItemId(memberId, itemId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND,
                        "장바구니에 해당 상품이 없습니다. (itemId=" + itemIdStr + ")"
                ));

        cartRepository.delete(cart);

        return DeleteCartItemRes.builder()
                .itemId(itemIdStr)
                .removed(true)
                .summary(buildSummary(memberId))
                .build();
    }

    // helper

    // 아이템 아이디를 String 으로 받는데 데이터베이스에는 정수 타입으로 입력되야해서 형변환을 한다.
    private Long parseItemId(String raw) {
        try {
            return Long.valueOf(raw);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("itemId 형식이 올바르지 않습니다. (itemId=" + raw + ")");
        }
    }

    private ItemDTO toItemDTO(ItemEntity item) {
            return modelMapper.map(item, ItemDTO.class);
    }

    private ItemDTO toItemDTO(CartEntity cart, boolean includeImages) {
        ItemEntity item = cart.getItem();
        ItemDTO dto = modelMapper.map(item, ItemDTO.class);

        if (includeImages) { dto.setThumbnails(extractThumbnails(item)); }

        dto.setQuantity(cart.getQuantity());

        return dto;
    }

    private List<String> extractThumbnails(ItemEntity item) {
        try {

            var method = item.getClass().getMethod("getThumbnails");
            Object val = method.invoke(item);
            if (val instanceof List<?> list) {
                // 문자열 리스트만 선별
                List<String> asString = list.stream()
                        .filter(Objects::nonNull)
                        .filter(o -> o instanceof String)
                        .map(o -> (String) o)
                        .toList();
                if (!asString.isEmpty()) return asString;
            }
        } catch (NoSuchMethodException ignore) {
            // thumbnails 게터가 없는 경우 -> images로 유도
        } catch (Exception e) {
            // 리플렉션 실패 시 images로 유도
        }

        // 2) images(예: List<ImageEntity>)에서 유도
        //    아래는 필드명이 다를 수 있으니 프로젝트 상황에 맞게 한 번만 손봐주세요.
        if (item.getImages() == null || item.getImages().isEmpty()) {
            return List.of();
        }

        // (A) 썸네일 플래그가 있다면 그걸 우선
        // boolean isThumbnail(), getUrl() 라고 가정
        List<String> byFlag = item.getImages().stream()
                .filter(Objects::nonNull)
                .filter(img -> {
                    try {
                        var m = img.getClass().getMethod("isThumbnail");
                        Object v = m.invoke(img);
                        return v instanceof Boolean b && b;
                    } catch (Exception e) {
                        return false;
                    }
                })
                .map(img -> {
                    try {
                        var m = img.getClass().getMethod("getUrl");
                        Object v = m.invoke(img);
                        return (v instanceof String s) ? s : null;
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .toList();

        if (!byFlag.isEmpty()) return byFlag;

        // (B) 플래그가 없다면 정렬 기준(예: sortOrder)로 첫 1~N장 추출
        // int getSortOrder(), String getUrl() 라고 가정
        return item.getImages().stream()
                .filter(Objects::nonNull)
                .sorted((a, b) -> {
                    try {
                        var ma = a.getClass().getMethod("getSortOrder");
                        var mb = b.getClass().getMethod("getSortOrder");
                        Object va = ma.invoke(a);
                        Object vb = mb.invoke(b);
                        int ia = (va instanceof Integer i) ? i : Integer.MAX_VALUE;
                        int ib = (vb instanceof Integer i) ? i : Integer.MAX_VALUE;
                        return Integer.compare(ia, ib);
                    } catch (Exception e) {
                        return 0;
                    }
                })
                .map(img -> {
                    try {
                        var m = img.getClass().getMethod("getUrl");
                        Object v = m.invoke(img);
                        return (v instanceof String s) ? s : null;
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .toList();
    }


    // 장바구니 정보 CartSummaryDTO 빌드하기
    private CartSummaryDTO buildSummary(String memberId) {

        // item 가격 접근이 있으므로 fetch join 메서드 사용
        List<CartEntity> all = cartRepository.findAllWithItemByMemberId(memberId);

        int count = all.size();
        int totalQty = all.stream().mapToInt(CartEntity::getQuantity).sum();
        // 총 삼품 금액 합계 : 각 행에 대해 (수량 * 상품가격)을 long으로 계산 후 모두 더함
        long totalPrice = all.stream()
                .mapToLong(c -> (long) c.getQuantity() * (long) c.getItem().getItemPrice())
                .sum();

        long totalDiscount = 0L; // 할인 로직은 일단 생략...
        long payable = totalPrice - totalDiscount;  // 최종 결제금액 = 총금액 - 할인액

        return CartSummaryDTO.builder()
                .count(count)
                .totalQuantity(totalQty)
                .totalPrice(totalPrice)
                .totalDiscount(totalDiscount)
                .payablePrice(payable)
                .currency("KRW")
                .build();
    }

}
