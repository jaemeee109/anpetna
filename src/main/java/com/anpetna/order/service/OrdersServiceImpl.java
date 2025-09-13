package com.anpetna.order.service;

import com.anpetna.cart.domain.CartEntity;
import com.anpetna.cart.repository.CartRepository;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.repository.ItemRepository;
import com.anpetna.member.domain.MemberEntity;                   // ✅ 연관 회원 엔티티
import com.anpetna.member.repository.MemberRepository;           // ✅ 회원 리포지토리
import com.anpetna.order.constant.OrdersStatus;
import com.anpetna.order.domain.AddressEntity;
import com.anpetna.order.domain.OrderEntity;
import com.anpetna.order.domain.OrdersEntity;
import com.anpetna.order.dto.AddressDTO;
import com.anpetna.order.dto.OrderDTO;
import com.anpetna.order.dto.createOrderDTO.CreateOrderReq;
import com.anpetna.order.dto.createOrderDTO.CreateOrderRes;
import com.anpetna.order.dto.readAllOrderDTO.ReadAllOrdersRes;
import com.anpetna.order.dto.readOneOrderDTO.ReadOneOrdersRes;
import com.anpetna.order.repository.OrderRepository;
import com.anpetna.order.repository.OrdersRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;   // ✅ 추가

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrdersServiceImpl implements OrdersService {

    private final OrdersRepository ordersRepository;
    //    private final OrderRepository orderRepository; // 집계용
    private static final int DEFAULT_SHIPPING_FEE = 3000;   // 기본 배송비 (입력 없을 경우 자동 적용)
    private final ItemRepository itemRepository;
    private final OrderRepository orderRepository;
    private final CartRepository cartRepository;
    private final MemberRepository memberRepository;

    // 추가=========================================================
    @Override
    @Transactional
    public CreateOrderRes create(String memberId, CreateOrderReq req) {
        if (memberId == null || memberId.isBlank())
            throw new IllegalArgumentException("memberId는 필수입니다.");
        if (req == null || req.getMode() == null)
            throw new IllegalArgumentException("mode는 필수입니다.");

        // 0) 회원 참조
        MemberEntity memberRef = memberRepository.getReferenceById(memberId);

        // 1) 배송비 결정 (요청값 없으면 기본값)
        int shippingFee = (req.getShippingFee() == null ? DEFAULT_SHIPPING_FEE : req.getShippingFee());
        if (shippingFee < 0) throw new IllegalArgumentException("shippingFee는 0 이상이어야 합니다.");

        // 2) 배송지 결정 (저장된 기본 배송지 vs 직접 입력)
        AddressEntity shippingAddr;
        if (req.isUseSavedAddress()) {
            shippingAddr = addressFromMember(memberRef);
            if (isEmptyAddress(shippingAddr)) {
                shippingAddr = toAddressEntity(req.getShippingAddress());
            }
        } else {
            shippingAddr = toAddressEntity(req.getShippingAddress());
        }
        if (isEmptyAddress(shippingAddr)) {
            throw new IllegalArgumentException("배송지 정보가 없습니다. (useSavedAddress 또는 shippingAddress 확인)");
        }

        // 3) 주문 헤더(아직 저장 X)
        OrdersEntity orders = OrdersEntity.builder()
                .memberId(memberRef)
                .cardId((req.getCardId() == null || req.getCardId().isBlank()) ? "MANUAL" : req.getCardId())
                .status(OrdersStatus.PENDING)
                .itemQuantity(0)
                .totalAmount(0)
                .shippingFee(shippingFee)
                .shippingAddress(shippingAddr)
                .build();

        int totalQty = 0;
        int itemsSubtotal = 0;

        // 4) 라인 생성 + 합계
        if (req.getMode() == CreateOrderReq.Mode.ITEM) {
            Long itemId = req.getItemId();
            int qty = (req.getQuantity() == null ? 1 : Math.max(1, req.getQuantity()));

            ItemEntity item = itemRepository.findById(itemId)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 상품: " + itemId));

            OrderEntity line = OrderEntity.builder()
                    .itemEntity(item)
                    .price(item.getItemPrice())
                    .quantity(qty)
                    .orders(orders)
                    .build();

            orders.getOrderItems().add(line);
            totalQty += qty;
            itemsSubtotal += item.getItemPrice() * qty;

        } else if (req.getMode() == CreateOrderReq.Mode.CART) {
            if (req.getItemIds() == null || req.getItemIds().isEmpty()) {
                throw new IllegalArgumentException("장바구니에서 구매할 itemIds가 비었습니다.");
            }
            for (Long itemId : req.getItemIds()) {
                CartEntity c = cartRepository.findByMember_MemberIdAndItem_ItemId(memberId, itemId)
                        .orElseThrow(() -> new IllegalArgumentException("장바구니에 해당 상품이 없습니다: " + itemId));

                ItemEntity item = c.getItem();
                int qty = Math.max(1, c.getQuantity());

                OrderEntity line = OrderEntity.builder()
                        .itemEntity(item)
                        .price(item.getItemPrice())
                        .quantity(qty)
                        .orders(orders)
                        .build();

                orders.getOrderItems().add(line);
                totalQty += qty;
                itemsSubtotal += item.getItemPrice() * qty;

                // 구매 후 장바구니 제거
                cartRepository.delete(c);
            }
        } else {
            throw new IllegalArgumentException("지원하지 않는 mode: " + req.getMode());
        }

        // 5) 헤더 집계 설정
        orders.setItemQuantity(totalQty);
        orders.setTotalAmount(itemsSubtotal + shippingFee);        // 총액 = 소계 + 배송비

        // 6) 대표 썸네일/파일명 (NOT NULL 회피)
        String thumb = firstImageUrlFromHeader(orders);
        orders.setItemImageUrl(thumb != null ? thumb : "");
        String thumbName = (thumb != null && !thumb.isBlank())
                ? thumb.substring(thumb.lastIndexOf('/') + 1) : "";
        orders.setItemImageName(thumbName);

        // 7) 저장 (라인은 cascade=persist)
        OrdersEntity saved = ordersRepository.save(orders);

        // 8) 응답
        return new CreateOrderRes(saved.getOrdersId());
    }
    // =========================================

    // 주문 생성 (결제 플로우용)
    @Override
    @Transactional
    public ReadOneOrdersRes createOrder(CreateOrderReq req) {
        // (필요시 유효성 검증 추가 가능)

        MemberEntity memberRef = memberRepository.getReferenceById(req.getMemberId());

        int shippingFee = (req.getShippingFee() == null ? DEFAULT_SHIPPING_FEE : req.getShippingFee());
        if (shippingFee < 0) throw new IllegalArgumentException("shippingFee는 0 이상이어야 합니다.");


        // 주소 폴백 로직을 넣어서 주소창이 비지 않도록 수정
        // 1) 요청으로 온 주소
        AddressEntity shippingAddr = toAddressEntity(req.getShippingAddress());

        // 2) 비어 있으면 → 최근 PENDING 주문 주소로 폴백 (람다/레퍼런스 사용하지 않고 명령형으로)
        if (isEmptyAddress(shippingAddr)) {
            Optional<OrdersEntity> recentOpt =
                    ordersRepository.findTopByMember_MemberIdAndStatusOrderByOrdersIdDesc(
                            req.getMemberId(), OrdersStatus.PENDING);

            if (recentOpt.isPresent()) {
                AddressEntity prev = recentOpt.get().getShippingAddress();
                if (!isEmptyAddress(prev)) {
                    shippingAddr = AddressEntity.builder()
                            .zipcode(prev.getZipcode())
                            .street(prev.getStreet())
                            .detail(prev.getDetail())
                            .receiver(prev.getReceiver())
                            .build();
                }
            }
        }

        // 3) (선택) 저장된 기본주소 사용 옵션
        if (isEmptyAddress(shippingAddr) && req.isUseSavedAddress()) {
            shippingAddr = addressFromMember(memberRef);
        }

        // 4) 최종 검증
        if (isEmptyAddress(shippingAddr)) {
            throw new IllegalArgumentException("배송지 정보가 없습니다. (useSavedAddress 또는 shippingAddress 확인)");
        }

        // === 기존 로직 ===
        OrdersEntity orders = OrdersEntity.builder()
                .memberId(memberRef)
                .cardId(req.getCardId())
                .shippingAddress(shippingAddr)
                .status(OrdersStatus.PENDING)
                .shippingFee(shippingFee)
                .itemQuantity(0)
                .totalAmount(0)
                .itemImageUrl(null)
                .build();

        int totalQty = 0;
        int subtotal = 0;
        for (var line : req.getItems()) {
            var item = itemRepository.findById(line.getItemId())
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 상품: " + line.getItemId()));
            int unitPrice = item.getItemPrice();
            orders.getOrderItems().add(OrderEntity.builder()
                    .itemEntity(item).price(unitPrice).quantity(line.getQuantity()).orders(orders).build());
            totalQty += line.getQuantity();
            subtotal += unitPrice * line.getQuantity();
        }

        orders.setItemQuantity(totalQty);
        orders.setTotalAmount(subtotal + shippingFee);

        String thumb = firstImageUrlFromHeader(orders);
        orders.setItemImageUrl(thumb);
        String thumbName = (thumb != null && !thumb.isBlank())
                ? thumb.substring(thumb.lastIndexOf('/') + 1) : "";
        orders.setItemImageName(thumbName);

        OrdersEntity saved = ordersRepository.save(orders);
        return toReadOneOrdersRes(saved);
    }

    // 주문 상태 전이
    @Override
    @Transactional
    public ReadOneOrdersRes updateStatus(Long ordersId, OrdersStatus nextStatus) {
        if (ordersId == null) throw new IllegalArgumentException("ordersId는 필수입니다.");
        if (nextStatus == null) throw new IllegalArgumentException("nextStatus는 필수입니다.");

        OrdersEntity orders = ordersRepository.findById(ordersId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다: " + ordersId));

        OrdersStatus current = orders.getStatus();
        if (!isValidTransition(current, nextStatus)) {
            throw new IllegalStateException("잘못된 상태 전이: " + current + " -> " + nextStatus);
        }

        orders.setStatus(nextStatus);
        return toReadOneOrdersRes(orders);
    }

    // 주문 상태 전이 허용 규칙 정의
    private boolean isValidTransition(OrdersStatus from, OrdersStatus to) {
        if (from == to) return true;
        return switch (from) {
            case PENDING   -> (to == OrdersStatus.PAID || to == OrdersStatus.CANCELLED);
            case PAID      -> (to == OrdersStatus.SHIPPED || to == OrdersStatus.CANCELLED || to == OrdersStatus.REFUNDED);
            case SHIPPED   -> (to == OrdersStatus.DELIVERED || to == OrdersStatus.REFUNDED);
            case DELIVERED -> (to == OrdersStatus.REFUNDED);
            case CANCELLED, REFUNDED -> false;
        };
    }

    // 계산서 단건 상세 보기
    @Override
    public ReadOneOrdersRes getDetail(Long ordersId) {
        if (ordersId == null) throw new IllegalArgumentException("ordersId는 비워둘 수 없습니다.");

        OrdersEntity e = ordersRepository.findByOrdersId(ordersId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다: " + ordersId));

        return toReadOneOrdersRes(e);
    }

    // 계산서 전체 보기
    @Override
    public ReadAllOrdersRes getAllOrders(Pageable pageable) {
        Page<OrdersEntity> page = ordersRepository.findAll(pageable);
        var rows = page.getContent().stream()
                .map(this::toSummaryLine)
                .toList();

        return ReadAllOrdersRes.builder()
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .pageNumber(page.getNumber())
                .pageSize(page.getSize())
                .content(rows)
                .build();
    }

    // 특정 회원의 계산서(주문서) 목록 요약 보기
    @Override
    public ReadAllOrdersRes getSummariesByMember(String memberId, Pageable pageable) {
        if (memberId == null || memberId.isBlank())
            throw new IllegalArgumentException("memberId는 비워둘 수 없습니다.");
        if (pageable == null)
            throw new IllegalArgumentException("pageable은 비워둘 수 없습니다.");

        Page<OrdersEntity> page = ordersRepository.findByMember_MemberId(memberId, pageable);
        var rows = page.getContent().stream()
                .map(this::toSummaryLine)
                .toList();

        return ReadAllOrdersRes.builder()
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .pageNumber(page.getNumber())
                .pageSize(page.getSize())
                .content(rows)
                .build();
    }

    /* =========================
       매핑 헬퍼
       ========================= */

    // 회원 엔티티로부터 기본 배송지 구성
    private AddressEntity addressFromMember(MemberEntity m) {
        if (m == null) return null;

        String zipcode  = safe(m.getMemberZipCode());
        String street   = safe(m.getMemberRoadAddress());
        String detail   = safe(m.getMemberDetailAddress());
        String receiver = safe(m.getMemberName());

        if (zipcode.isBlank() && street.isBlank() && detail.isBlank() && receiver.isBlank()) {
            return null;
        }
        return AddressEntity.builder()
                .zipcode(zipcode)
                .street(street)
                .detail(detail)
                .receiver(receiver)
                .build();
    }

    private String safe(String s) { return (s == null ? "" : s.trim()); }
    private boolean isEmptyAddress(AddressEntity a) {
        return a == null
                || (safe(a.getZipcode()).isBlank()
                && safe(a.getStreet()).isBlank()
                && safe(a.getDetail()).isBlank()
                && safe(a.getReceiver()).isBlank());
    }

    // Entity -> DTO 변환
    private AddressDTO toAddressDTO(AddressEntity a) {
        if (a == null) return null;
        return AddressDTO.builder()
                .zipcode(a.getZipcode())
                .street(a.getStreet())
                .detail(a.getDetail())
                .receiver(a.getReceiver())
                .build();
    }

    // DTO -> Entity
    private AddressEntity toAddressEntity(AddressDTO dto) {
        if (dto == null) return null;
        return AddressEntity.builder()
                .zipcode(dto.getZipcode())
                .street(dto.getStreet())
                .detail(dto.getDetail())
                .receiver(dto.getReceiver())
                .build();
    }

    // 상세 DTO (헤더 + 라인)
    private ReadOneOrdersRes toReadOneOrdersRes(OrdersEntity o) {
        List<OrderDTO> lines = (o.getOrderItems() == null) ? List.of()
                : o.getOrderItems().stream().map(this::toOrderLineDTO).toList();

        int shippingFee = o.getShippingFee();
        int totalAmount = o.getTotalAmount();
        int itemsSubtotal = totalAmount - shippingFee;

        return ReadOneOrdersRes.builder()
                .ordersId(o.getOrdersId())
                .memberId(o.getMemberId() != null ? o.getMemberId().getMemberId() : null)
                .cardId(o.getCardId())
                .itemsSubtotal(itemsSubtotal)
                .shippingFee(shippingFee)
                .totalAmount(totalAmount)
                .thumbnailUrl(o.getItemImageUrl())
                .status(OrdersStatus.valueOf(o.getStatus().name()))
                .shippingAddress(toAddressDTO(o.getShippingAddress()))
                .ordersItems(lines)
                .build();
    }

    // 목록 요약
    private ReadAllOrdersRes.Line toSummaryLine(OrdersEntity o) {
        int shipping   = o.getShippingFee();
        int grandTotal = o.getTotalAmount();
        int itemQty    = o.getItemQuantity();
        int subtotal   = grandTotal - shipping;

        return ReadAllOrdersRes.Line.builder()
                .ordersId(o.getOrdersId())
                .memberId(o.getMemberId() != null ? o.getMemberId().getMemberId() : null)
                .itemQuantity(itemQty)
                .itemsSubtotal(subtotal)
                .shippingFee(shipping)
                .totalAmount(grandTotal)
                .thumbnailUrl(o.getItemImageUrl())
                .status(OrdersStatus.valueOf(o.getStatus().name()))
                .build();
    }

    // 주문 품목 DTO로 변환
    private OrderDTO toOrderLineDTO(OrderEntity e) {
        return OrderDTO.builder()
                .orderId(e.getOrderId())
                .itemId(e.getItemEntity() != null ? e.getItemEntity().getItemId() : null)
                .price(e.getPrice())
                .quantity(e.getQuantity())
                .thumbnailUrl(firstImageUrl(e))
                .build();
    }

    // 라인 아이템의 첫 번째 이미지 URL 반환
    private String firstImageUrl(OrderEntity line) {
        if (line == null || line.getItemEntity() == null) return null;
        var images = line.getItemEntity().getImages();
        if (images == null || images.isEmpty()) return null;

        return images.get(0).getUrl();
    }

    // 주문 헤더 기준 첫 번째 라인의 첫 이미지 반환
    private String firstImageUrlFromHeader(OrdersEntity orders) {
        if (orders.getOrderItems() == null || orders.getOrderItems().isEmpty()) return null;
        return firstImageUrl(orders.getOrderItems().get(0));
    }
}
