package com.anpetna.order.service;

import com.anpetna.cart.domain.CartEntity;
import com.anpetna.cart.repository.CartRepository;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.repository.ItemRepository;
<<<<<<< HEAD
import com.anpetna.member.domain.MemberEntity;                   // ✅ 연관 회원 엔티티
import com.anpetna.member.repository.MemberRepository;           // ✅ 회원 리포지토리
=======
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;            // ✅ ADDED
>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
<<<<<<< HEAD
import java.util.Optional;   // ✅ 추가
=======
>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrdersServiceImpl implements OrdersService {

    private final OrdersRepository ordersRepository;
<<<<<<< HEAD
    //    private final OrderRepository orderRepository; // 집계용
=======
//    private final OrderRepository orderRepository; // 집계용
    // 계산 로직을 Entity에 컬럼을 두고 DB에서 계산하는 형식으로 바꾸면서 주석 처리.

>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
    private static final int DEFAULT_SHIPPING_FEE = 3000;   // 기본 배송비 (입력 없을 경우 자동 적용)
    private final ItemRepository itemRepository;
    private final OrderRepository orderRepository;
    private final CartRepository cartRepository;
<<<<<<< HEAD
    private final MemberRepository memberRepository;
=======
    //    private static final int FREE_SHIPPING_THRESHOLD = 100_000; // 10만원 이상 무료 배송
    private final MemberRepository memberRepository;          // ✅ ADDED

    // 기존에는 임의로 설정한 배송비와 무료배송비용 사용.
    // 이를 DTO에 추가하여 입력한 값을 배송비, 무료배송비용으로 사용하게끔 변경.
    // -> 입력받으면 받은 값을, 안 받으면 기본 배송비 부여

    // 추가=========================================================
    @Transactional
    @Override
    public CreateOrderRes create(MemberEntity memberId, CreateOrderReq req) {
        if (memberId == null)
            throw new IllegalArgumentException("memberId는 필수입니다.");
        if (req == null || req.getMode() == null)
            throw new IllegalArgumentException("mode는 필수입니다.");

        // 1) 주문 헤더(아직 저장하지 않음)
        OrdersEntity orders = OrdersEntity.builder()
                .memberId(memberId)                 // ✅ CHANGED: .memberId(...) -> .member(...)
                .cardId("MANUAL")
                .status(OrdersStatus.PENDING)
                .itemQuantity(0)
                .totalAmount(0)
                .build();

        // [ADDED] 배송비: 프론트에서 값을 넘겨주면 사용, 없으면 기본 배송비 부여
        final int shippingFee =
                (req.getShippingFee() == null ? DEFAULT_SHIPPING_FEE : req.getShippingFee());
        orders.setShippingFee(shippingFee); // [ADDED]

        // [ADDED] 배송지: checkout 페이지에서 입력한 배송지 정보 반영
        // (createOrder() 경로와 동일한 방식. 기존 메서드에는 누락되어 있던 부분)
        orders.setShippingAddress(toAddressEntity(req.getShippingAddress())); // [ADDED]
        // ※ useSavedAddress(true) 같은 회원 프로필 재사용 로직은 이 메서드에서는 처리하지 않고,
        //   프론트가 shippingAddress를 채워 보내도록 통일. (필요하면 이후 memberRepository 주입 후 분기 추가 가능)

        int totalQty = 0;
        int totalAmt = 0;

        // 2) 라인 생성 + 합계 집계
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
            totalAmt += item.getItemPrice() * qty;

        } else if (req.getMode() == CreateOrderReq.Mode.CART) {
            if (req.getItemIds() == null || req.getItemIds().isEmpty()) {
                throw new IllegalArgumentException("장바구니에서 구매할 itemIds가 비었습니다.");
            }
            for (Long itemId : req.getItemIds()) {
                // ✅ CHANGED: CartRepository는 String memberId를 받으므로 엔티티에서 꺼내 전달
                CartEntity c = cartRepository.findByMember_MemberIdAndItem_ItemId(memberId.getMemberId(), itemId)
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
                totalAmt += item.getItemPrice() * qty;

                // 구매 완료 후 장바구니에서 제거
                cartRepository.delete(c);
            }
        } else {
            throw new IllegalArgumentException("지원하지 않는 mode: " + req.getMode());
        }

        // 3) 헤더 집계값 + 대표 이미지 설정 (대표 이미지가 없으면 빈 문자열로 보정해 NOT NULL 회피)
        orders.setItemQuantity(totalQty);

        // [OLD] orders.setTotalAmount(totalAmt);
        orders.setTotalAmount(totalAmt + shippingFee); // [CHANGED] 총 금액 = 소계 + 배송비 (createOrder와 일치)

        String thumb = firstImageUrlFromHeader(orders); // 동일 클래스에 이미 존재하는 보조 메소드
        orders.setItemImageUrl(thumb != null ? thumb : "");

        // ImageName이 없는 오류 수정
        String thumbName = (thumb != null && !thumb.isBlank())
                ? thumb.substring(thumb.lastIndexOf('/') + 1)
                : "";
        orders.setItemImageName(thumbName);

        // 4) 한 번만 최종 저장 (라인은 cascade=persist로 함께 저장)
        OrdersEntity saved = ordersRepository.save(orders);

        // 5) 응답
        return new CreateOrderRes(saved.getOrdersId());
    }
    // =========================================

>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")

    // 추가=========================================================
    @Override
<<<<<<< HEAD
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
=======
    public CreateOrderRes create(String memberId, CreateOrderReq req) {
        return null;
    }

    // 주문 생성
    @Override
    @Transactional
    public ReadOneOrdersRes createOrder(CreateOrderReq req) {
        if (req == null) throw new IllegalArgumentException("요청이 비었습니다.");

        if (req.getMemberId() == null)
            throw new IllegalArgumentException("memberId는 필수입니다.");
        // 주문 식별자 검증
        if (req.getCardId() == null || req.getCardId().isBlank())
            throw new IllegalArgumentException("cardId는 필수입니다.");
        // 결제 식별자 검증

        if (req.getItems() == null || req.getItems().isEmpty())
            throw new IllegalArgumentException("주문 품목이 비었습니다.");
        // 최소 1개 이상의 주문 라인이 있어야 함

        // ✅ ADDED: MemberEntity 로드 (연관관계 저장용)
        MemberEntity memberRef = memberRepository.getReferenceById(req.getMemberId().getMemberId());

        // 배송비: 프론트에서 값을 넘겨주면 사용, 없으면 기본 배송비 부여
        int shippingFee = (req.getShippingFee() == null ? DEFAULT_SHIPPING_FEE : req.getShippingFee());
        if (shippingFee < 0) throw new IllegalArgumentException("shippingFee는 0 이상이어야 합니다."); // 배송비 음수 방지

        // 배송지 정보
        AddressEntity shippingAddr = toAddressEntity(req.getShippingAddress());

        // 주문 헤더 생성
        OrdersEntity orders = OrdersEntity.builder()
                .memberId(memberRef)             // ✅ CHANGED: String -> MemberEntity
                .cardId(req.getCardId())    // 결제 카드 ID
                .shippingAddress(shippingAddr)  // 배송지
                .status(OrdersStatus.PENDING) // 배송 상태, 최초 생성 시 상태는 PENDING
                .shippingFee(shippingFee)     // 배송비, 입력받은 값(없으면 기본값) 저장
                .itemQuantity(0)              // 총 수량, 합계는 아래에서 계산
                .totalAmount(0)               // 총 금액, 합계는 아래에서 계산
                .itemImageUrl(null)           // 이미지, 대표 이미지도 아래에서 설정
                .build();

        // 주문 품목 라인 생성 + 합계 계산
        int totalQty = 0;
        int subtotal = 0;

        for (var line : req.getItems()) {
            ItemEntity item = itemRepository.findById(line.getItemId())
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 상품: " + line.getItemId()));
            // 상품 ID로 실제 상품을 조회. 없으면 예외(잘못된 요청 방지)

            int unitPrice = item.getItemPrice(); // ItemEntity의 가격 필드 사용
            int lineTotal = unitPrice * line.getQuantity();

            OrderEntity orderLine = OrderEntity.builder()
                    .itemEntity(item)
                    .price(unitPrice)
                    .quantity(line.getQuantity())
                    .orders(orders)
                    .build();

            orders.getOrderItems().add(orderLine);
            totalQty += line.getQuantity();
            subtotal += lineTotal;
        }

        // 총 수량 + 총 금액(소계 + 배송비) 저장
        orders.setItemQuantity(totalQty);
        orders.setTotalAmount(subtotal + shippingFee); // 헤더의 총 금액 = 소계 + 배송비

        // 대표 썸네일: 첫 라인의 첫 이미지 사용
        orders.setItemImageUrl(firstImageUrlFromHeader(orders));
>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")

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

<<<<<<< HEAD
=======
        // 상태 변경
>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
        orders.setStatus(nextStatus);
        return toReadOneOrdersRes(orders);
    }

    // 주문 상태 전이 허용 규칙 정의
    private boolean isValidTransition(OrdersStatus from, OrdersStatus to) {
<<<<<<< HEAD
        if (from == to) return true;
        return switch (from) {
            case PENDING   -> (to == OrdersStatus.PAID || to == OrdersStatus.CANCELLED);
            case PAID      -> (to == OrdersStatus.SHIPPED || to == OrdersStatus.CANCELLED || to == OrdersStatus.REFUNDED);
            case SHIPPED   -> (to == OrdersStatus.DELIVERED || to == OrdersStatus.REFUNDED);
            case DELIVERED -> (to == OrdersStatus.REFUNDED);
            case CANCELLED, REFUNDED -> false;
=======
        if (from == to) return true; // 같은 상태는 허용
        return switch (from) {
            case PENDING   -> (to == OrdersStatus.PAID
                    || to == OrdersStatus.CANCELLED);
            case PAID      -> (to == OrdersStatus.SHIPPED
                    || to == OrdersStatus.CANCELLED
                    || to == OrdersStatus.REFUNDED);     // 결제 후 환불 허용
            case SHIPPED   -> (to == OrdersStatus.DELIVERED
                    || to == OrdersStatus.REFUNDED);     // 발송 후도 환불 허용
            case DELIVERED -> (to == OrdersStatus.REFUNDED);     // 배송완료 후 환불 허용(반품 환불 등)
            case CANCELLED, REFUNDED -> false;      // 종단 상태: 더 이상 전이 불가
>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
        };
    }

    // 계산서 단건 상세 보기
    @Override
    public ReadOneOrdersRes getDetail(Long ordersId) {
        if (ordersId == null) throw new IllegalArgumentException("ordersId는 비워둘 수 없습니다.");

        OrdersEntity e = ordersRepository.findByOrdersId(ordersId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다: " + ordersId));

<<<<<<< HEAD
        return toReadOneOrdersRes(e);
=======
        return toReadOneOrdersRes(e); // toReadOneOrdersRes에서 DTO 변환 작업
>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
    }

    // 계산서 전체 보기
    @Override
    public ReadAllOrdersRes getAllOrders(Pageable pageable) {
<<<<<<< HEAD
=======
        // 페이징 메타데이터(전체 건수/페이지수/현재 페이지/사이즈)와 함께 각 행은 toSummaryLine으로 요약 DTO로 매핑.

        // 주문을 요약 DTO(line)으로 변환
>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
        Page<OrdersEntity> page = ordersRepository.findAll(pageable);
        var rows = page.getContent().stream()
                .map(this::toSummaryLine)
                .toList();

<<<<<<< HEAD
=======
        // 페이징 메타데이터 + 변환된 요약행 반환
>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
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
<<<<<<< HEAD
    public ReadAllOrdersRes getSummariesByMember(String memberId, Pageable pageable) {
        if (memberId == null || memberId.isBlank())
=======
    public ReadAllOrdersRes getSummariesByMember(MemberEntity memberId, Pageable pageable) {
        // findByMemberId로 해당 회원의 주문서들만 페이징 조회.
        // 나머지 구성은 전체 목록과 동일(요약 라인 매핑 + 페이징 메타).
        if (memberId == null)
>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
            throw new IllegalArgumentException("memberId는 비워둘 수 없습니다.");
        if (pageable == null)
            throw new IllegalArgumentException("pageable은 비워둘 수 없습니다.");

<<<<<<< HEAD
        Page<OrdersEntity> page = ordersRepository.findByMember_MemberId(memberId, pageable);
        var rows = page.getContent().stream()
                .map(this::toSummaryLine)
                .toList();

=======
        // ✅ CHANGED: OrdersRepository도 연관 필드명 기준으로 변경 필요
        Page<OrdersEntity> page = ordersRepository.findByMember(memberId, pageable);

        // DTO로 변환
        var rows = page.getContent().stream()
                .map(this::toSummaryLine)
                .toList();

>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
        return ReadAllOrdersRes.builder()
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .pageNumber(page.getNumber())
                .pageSize(page.getSize())
                .content(rows)
                .build();
    }

<<<<<<< HEAD
=======
    // 배송지변경 추가★
    @Override
    @Transactional
    public ReadOneOrdersRes updateAddress(Long ordersId, AddressDTO address) {
        OrdersEntity orders = ordersRepository.findByOrdersId(ordersId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "주문을 찾을 수 없습니다."));
        orders.setShippingAddress(toAddressEntity(address));
        ordersRepository.save(orders);
        return toReadOneOrdersRes(orders);
    }

>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
    /* =========================
       매핑 헬퍼
       ========================= */

    // 회원 엔티티로부터 기본 배송지 구성
    private AddressEntity addressFromMember(MemberEntity m) {
        if (m == null) return null;

<<<<<<< HEAD
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
=======
    // Entity -> DTO 변환
    private AddressDTO toAddressDTO(AddressEntity a) {
        if (a == null) return null;
        return AddressDTO.builder()
                .zipcode(a.getZipcode())
                .street(a.getStreet())
                .detail(a.getDetail())
                .receiver(a.getReceiver())
>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
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

<<<<<<< HEAD
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

=======
    // 상세 DTO (헤더 + 라인)
    private ReadOneOrdersRes toReadOneOrdersRes(OrdersEntity o) {
        // 주문 품목을 DTO로 변환
        List<OrderDTO> lines = (o.getOrderItems() == null) ? List.of()
                : o.getOrderItems().stream().map(this::toOrderLineDTO).toList();

        // DB 집계로 금액 계산
>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
        int shippingFee = o.getShippingFee();
        int totalAmount = o.getTotalAmount();
        int itemsSubtotal = totalAmount - shippingFee;

        return ReadOneOrdersRes.builder()
<<<<<<< HEAD
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
=======
                .ordersId(o.getOrdersId())  // 주문 ID
                .memberId(o.getMemberId() != null ? o.getMemberId() : null)  // ✅ CHANGED
                .cardId(o.getCardId())      // 카드 ID
                .itemsSubtotal(itemsSubtotal)   // 물건값
                .shippingFee(shippingFee)       // 배송비
                .totalAmount(totalAmount)       // 총 금액
                .thumbnailUrl(o.getItemImageUrl())  // 대표 이미지
                .status(OrdersStatus.valueOf(o.getStatus().name()))   // 주문 상태
                .shippingAddress(toAddressDTO(o.getShippingAddress()))  // 배송지
                .ordersItems(lines) // 품목 리스트
>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
                .build();
    }

    // 목록 요약
    private ReadAllOrdersRes.Line toSummaryLine(OrdersEntity o) {
        int shipping   = o.getShippingFee();
        int grandTotal = o.getTotalAmount();
        int itemQty    = o.getItemQuantity();
        int subtotal   = grandTotal - shipping;

        return ReadAllOrdersRes.Line.builder()
<<<<<<< HEAD
                .ordersId(o.getOrdersId())
                .memberId(o.getMemberId() != null ? o.getMemberId().getMemberId() : null)
                .itemQuantity(itemQty)
                .itemsSubtotal(subtotal)
                .shippingFee(shipping)
                .totalAmount(grandTotal)
                .thumbnailUrl(o.getItemImageUrl())
                .status(OrdersStatus.valueOf(o.getStatus().name()))
=======
                .ordersId(o.getOrdersId())      // 주문 ID
                .memberId(o.getMemberId() != null ? o.getMemberId() : null) // ✅ CHANGED
                .itemQuantity(itemQty)          // 총 수량
                .itemsSubtotal(subtotal)        // 물건값
                .shippingFee(shipping)          // 배송비
                .totalAmount(grandTotal)        // 총 금액
                .thumbnailUrl(o.getItemImageUrl())  // 이미지
                .status(OrdersStatus.valueOf(o.getStatus().name()))   // 배송상태
>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
                .build();
    }

    // 주문 품목 DTO로 변환
    private OrderDTO toOrderLineDTO(OrderEntity e) {
        return OrderDTO.builder()
                .orderId(e.getOrderId())
                .itemId(e.getItemEntity() != null ? e.getItemEntity().getItemId() : null)
<<<<<<< HEAD
=======
                .name(e.getItemEntity() != null ? e.getItemEntity().getItemName() : null) // ★ 추가
>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
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
<<<<<<< HEAD
=======

    // 배송지
    private AddressEntity toAddressEntity(AddressDTO dto) {
        if (dto == null) return null;
        return AddressEntity.builder()
                .zipcode(dto.getZipcode())
                .street(dto.getStreet())
                .detail(dto.getDetail())
                .receiver(dto.getReceiver())
                .build();
    }

>>>>>>> parent of c49a2d6 (Revert "OrdersServiceImpl 오류 수정, AddressEntity/DTO 에 phone(연락처) 추가")
}
