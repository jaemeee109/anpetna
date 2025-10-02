package com.anpetna.order.service;

import com.anpetna.cart.domain.CartEntity;
import com.anpetna.cart.repository.CartRepository;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.repository.ItemRepository;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;
import com.anpetna.notification.feature.stock.service.StockLowNotificationService;
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
import com.anpetna.item.constant.ItemSellStatus;


import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrdersServiceImpl implements OrdersService {

    private final OrdersRepository ordersRepository;
//    private final OrderRepository orderRepository; // 집계용
    // 계산 로직을 Entity에 컬럼을 두고 DB에서 계산하는 형식으로 바꾸면서 주석 처리.

    private static final int DEFAULT_SHIPPING_FEE = 3000;   // 기본 배송비 (입력 없을 경우 자동 적용)
    private final ItemRepository itemRepository;
    private final OrderRepository orderRepository;
    private final CartRepository cartRepository;
    //    private static final int FREE_SHIPPING_THRESHOLD = 100_000; // 10만원 이상 무료 배송
    private final MemberRepository memberRepository;
    private final StockLowNotificationService stockLowNotificationService;

    // 기존에는 임의로 설정한 배송비와 무료배송비용 사용.
    // 이를 DTO에 추가하여 입력한 값을 배송비, 무료배송비용으로 사용하게끔 변경.
    // -> 입력받으면 받은 값을, 안 받으면 기본 배송비 부여

    // 추가=========================================================
    @Transactional
    @Override
    public CreateOrderRes create(String memberId, CreateOrderReq req) {
        if (memberId == null || memberId.isBlank())
            throw new IllegalArgumentException("memberId는 필수입니다.");
        if (req == null || req.getMode() == null)
            throw new IllegalArgumentException("mode는 필수입니다.");

        MemberEntity member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원: " + memberId));

        // 1) 주문 헤더(아직 저장하지 않음)
        OrdersEntity orders = OrdersEntity.builder()
                .memberId(member)
                .cardId("MANUAL")
                .status(OrdersStatus.PENDING)
                .itemQuantity(0)
                .totalAmount(0)
                .build();

        // 배송비
        final int shippingFee =
                (req.getShippingFee() == null ? DEFAULT_SHIPPING_FEE : req.getShippingFee());
        orders.setShippingFee(shippingFee);

        // 배송지
        orders.setShippingAddress(toAddressEntity(req.getShippingAddress()));

        int totalQty = 0;
        int totalAmt = 0;

        // 2) 라인 생성 + 합계 집계
        if (req.getMode() == CreateOrderReq.Mode.ITEM) {
            Long itemId = req.getItemId();
            int qty = (req.getQuantity() == null ? 1 : Math.max(1, req.getQuantity()));

            ItemEntity item = itemRepository.findById(itemId)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 상품: " + itemId));

            OrderEntity line = OrderEntity.builder()
                    .item(item)
                    .price(item.getItemPrice())   // 단가 저장
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
                CartEntity c = cartRepository.findByMember_MemberIdAndItem_ItemId(memberId, itemId)
                        .orElseThrow(() -> new IllegalArgumentException("장바구니에 해당 상품이 없습니다: " + itemId));

                ItemEntity item = c.getItem();
                int qty = Math.max(1, c.getQuantity());

                OrderEntity line = OrderEntity.builder()
                        .item(item)
                        .price(item.getItemPrice())  // 단가 저장
                        .quantity(qty)
                        .orders(orders)
                        .build();

                orders.getOrderItems().add(line);
                totalQty += qty;
                totalAmt += item.getItemPrice() * qty;


            }
        } else {
            throw new IllegalArgumentException("지원하지 않는 mode: " + req.getMode());
        }

        // 3) 헤더 집계값 + 대표 이미지
        orders.setItemQuantity(totalQty);
        orders.setTotalAmount(totalAmt + shippingFee); // 소계 + 배송비
        String thumb = firstImageUrlFromHeader(orders);
        orders.setOrdersThumbnail(thumb != null ? thumb : "");

        // 4) 저장 (라인은 cascade=persist)
        OrdersEntity saved = ordersRepository.save(orders);

        // 5) 응답
        return new CreateOrderRes(saved.getOrdersId());
    }

    // =========================================


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


        // 상태 변경
        orders.setStatus(nextStatus);

        /*  결제 성공 시 해당 회원 장바구니에서 이 주문 품목들만 제거  */
        if (nextStatus == OrdersStatus.PAID) {
            String mId = (orders.getMemberId() != null) ? orders.getMemberId().getMemberId() : null;
            if (mId != null && orders.getOrderItems() != null) {
                for (OrderEntity line : orders.getOrderItems()) {
                    ItemEntity item = line.getItem();
                    if (item == null) continue;
                    var opt = cartRepository.findByMember_MemberIdAndItem_ItemId(mId, item.getItemId());
                    opt.ifPresent(cartRepository::delete);
                }
            }
            // 결제 확정 시점에만 재고 차감
            if (orders.getOrderItems() != null) {
                for (OrderEntity line : orders.getOrderItems()) {
                    ItemEntity item = line.getItem();
                    if (item == null) continue;

                    int qty = Math.max(1, line.getQuantity());
                    int cur = Math.max(0, item.getItemStock());
                    int next = cur - qty;
                    if (next < 0) {
                        // 결제 도중 재고가 부족해진 희귀 케이스 → 결제 승인 직후라도 충돌로 처리
                        throw new ResponseStatusException(HttpStatus.CONFLICT,
                                "결제 중 재고가 부족해졌습니다. itemId=" + (item.getItemId()) + ", 요청수량=" + qty + ", 현재고=" + cur);
                    }

                    item.setItemStock(next);
                    item.setItemSellStatus(next <= 0 ? ItemSellStatus.SOLD_OUT : ItemSellStatus.SELL);
                    itemRepository.save(item);

                    // (선택) 재고 임계 알림
                    try { stockLowNotificationService.notifyStockLow(item, next); } catch (Exception ignore) {}
                }
            }

        }
        // 취소 환불 시 재고 복원
        if ((nextStatus == OrdersStatus.CANCELLED || nextStatus == OrdersStatus.REFUNDED)
                && current == OrdersStatus.PAID) {
            if (orders.getOrderItems() != null) {
                for (OrderEntity line : orders.getOrderItems()) {
                    ItemEntity item = line.getItem();
                    if (item == null) continue;

                    int qty = Math.max(1, line.getQuantity());
                    int cur = Math.max(0, item.getItemStock());
                    int restored = cur + qty;

                    item.setItemStock(restored);
                    item.setItemSellStatus(restored <= 0 ? ItemSellStatus.SOLD_OUT : ItemSellStatus.SELL);
                    itemRepository.save(item);
                }
            }
        }

        return toReadOneOrdersRes(orders);

    }

    //상태(관리자)
    private static final Map<OrdersStatus, Set<OrdersStatus>> ALLOWED = Map.of(
            OrdersStatus.PAID,           Set.of(OrdersStatus.SHIPMENT_READY, OrdersStatus.CANCELLED, OrdersStatus.REFUNDED, OrdersStatus.CONFIRMATION),
            OrdersStatus.SHIPMENT_READY, Set.of(OrdersStatus.PAID, OrdersStatus.SHIPPED, OrdersStatus.CANCELLED),
            OrdersStatus.SHIPPED,        Set.of(OrdersStatus.DELIVERED, OrdersStatus.REFUNDED, OrdersStatus.CONFIRMATION),
            OrdersStatus.DELIVERED,      Set.of(OrdersStatus.CONFIRMATION, OrdersStatus.REFUNDED)
    );



    @Override
    @Transactional
    public ReadOneOrdersRes adminStatus(Long ordersId, OrdersStatus next, String reason) {

        // 주문 로드
        OrdersEntity o = ordersRepository.findById(ordersId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "주문 없음: " + ordersId));

        // 허용 전이 검증(기존 ALLOWED 맵 사용)
        OrdersStatus prev = o.getStatus();
        if (!ALLOWED.getOrDefault(prev, Set.of()).contains(next)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "허용되지 않은 전이: " + prev + " -> " + next
            );
        }

        // 상태 변경
        o.setStatus(next);

        /* ✅ 재고 복원: 주문취소/환불로 전이될 때만 재고를 되돌립니다. */
        if (next == OrdersStatus.CANCELLED || next == OrdersStatus.REFUNDED) {
            if (o.getOrderItems() != null) {
                for (OrderEntity line : o.getOrderItems()) {
                    ItemEntity item = line.getItem();
                    if (item == null) continue;

                    int qty = Math.max(1, line.getQuantity());
                    int cur = Math.max(0, item.getItemStock());
                    int restored = cur + qty;

                    item.setItemStock(restored);
                    item.setItemSellStatus(restored <= 0 ? ItemSellStatus.SOLD_OUT : ItemSellStatus.SELL);

                    // 영속 컨텍스트에 붙어 있으므로 save() 없어도 되지만, 확실히 하려면 아래 한 줄 유지 가능
                    itemRepository.save(item);
                }
            }
        }

        // (중요) ✅ 구매확정 전이 시 추가 차감 로직은 더 이상 없음
        //  - 차감은 create(...)에서 이미 처리됨
        //  - CONFIRMATION 이동은 재고 변화 없음

        // 최종 응답(파일 내 존재하는 변환 메서드 사용)
        return toReadOneOrdersRes(o);
    }






    private ReadOneOrdersRes toReadOne(OrdersEntity o) { /* 매핑 */ return null; }


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
    // 주문 상태 전이 허용 규칙
    private boolean isValidTransition(OrdersStatus from, OrdersStatus to) {
        if (from == to) return true;
        return switch (from) {
            case PENDING    -> (to == OrdersStatus.PAID
                    || to == OrdersStatus.CANCELLED);
            case PAID       -> (to == OrdersStatus.SHIPMENT_READY
                    || to == OrdersStatus.SHIPPED
                    || to == OrdersStatus.CANCELLED
                    || to == OrdersStatus.REFUNDED
                    || to == OrdersStatus.CONFIRMATION); // ★ 허용 추가
            case SHIPMENT_READY ->
                    (to == OrdersStatus.SHIPPED || to == OrdersStatus.CANCELLED);
            case SHIPPED    -> (to == OrdersStatus.DELIVERED
                    || to == OrdersStatus.REFUNDED
                    || to == OrdersStatus.CONFIRMATION); // ★ 허용 추가
            case DELIVERED  -> (to == OrdersStatus.CONFIRMATION
                    || to == OrdersStatus.REFUNDED);
            case CONFIRMATION, CANCELLED, REFUNDED -> false; // 종단 상태
        };

    }



    // 계산서 단건 상세 보기
    @Override
    public ReadOneOrdersRes getDetail(Long ordersId) {
        if (ordersId == null) throw new IllegalArgumentException("ordersId는 비워둘 수 없습니다.");

        OrdersEntity e = ordersRepository.findByOrdersId(ordersId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다: " + ordersId));

        return toReadOneOrdersRes(e); // toReadOneOrdersRes에서 DTO 변환 작업
    }

    // 계산서 전체 보기
    @Override
    public ReadAllOrdersRes getAllOrders(Pageable pageable) {
        // 페이징 메타데이터(전체 건수/페이지수/현재 페이지/사이즈)와 함께 각 행은 toSummaryLine으로 요약 DTO로 매핑.

        // 주문을 요약 DTO(line)으로 변환
        Page<OrdersEntity> page = ordersRepository.findAll(pageable);
        var rows = page.getContent().stream()
                .map(this::toSummaryLine)
                .toList();

        // 페이징 메타데이터 + 변환된 요약행 반환
        return ReadAllOrdersRes.builder()
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .pageNumber(page.getNumber())
                .pageSize(page.getSize())
                .content(rows)
                .build();
    }

    //회계
    @Override
    public ReadAllOrdersRes erp(String from, String to,
                                OrdersStatus status, String memberId,
                                Pageable pageable){
        LocalDate fromD = LocalDate.parse(from);               // yyyy-MM-dd
        LocalDate toD   = LocalDate.parse(to).plusDays(1);     // 포함 범위 → 미만 비교 위해 +1d
        LocalDateTime fromDt = fromD.atStartOfDay();
        LocalDateTime toDt   = toD.atStartOfDay();

        Page<OrdersEntity> page = ordersRepository.findErpList(fromDt, toDt, status, memberId, pageable);
        List<Object[]> list = ordersRepository.sumErp(fromDt, toDt, status, memberId);
        Object[] sums = list.isEmpty() ? new Object[]{0,0,0,0} : list.get(0);
        long sumItemsSubtotal = toLong(sums[0]);
        long sumShippingFee   = toLong(sums[1]);
        long sumTotalAmount   = toLong(sums[2]);

        // 목록 -> Line 매핑
        List<ReadAllOrdersRes.Line> lines = page.getContent().stream()
                .map(this::toLine)
                .toList();

        // 맨 앞에 요약 한 줄 삽입 (ordersId=0, memberId="TOTAL")
        ReadAllOrdersRes.Line summary = ReadAllOrdersRes.Line.builder()
                .ordersId(0L)
                .memberId("TOTAL")
                .itemQuantity(0) // 필요시 sums[3] 사용해 총 수량 넣으셔도 됨
                .itemsSubtotal((int) sumItemsSubtotal)
                .shippingFee((int) sumShippingFee)
                .totalAmount((int) sumTotalAmount)
                .status(null)
                .thumbnailUrl(null)
                .build();

        List<ReadAllOrdersRes.Line> content =
                new java.util.ArrayList<>(lines.size() + 1);
        content.add(summary);
        content.addAll(lines);

        return ReadAllOrdersRes.builder()
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .pageNumber(page.getNumber())
                .pageSize(page.getSize())
                .content(content)
                .build();
    }
    //매핑
    private ReadAllOrdersRes.Line toLine(OrdersEntity o) {
        return ReadAllOrdersRes.Line.builder()
                .ordersId(o.getOrdersId())
                .memberId(o.getMemberId().getMemberId())
                .itemQuantity(o.getItemQuantity())
                .itemsSubtotal(o.getTotalAmount() - o.getShippingFee())
                .shippingFee(o.getShippingFee())
                .totalAmount(o.getTotalAmount())
                .status(o.getStatus())
                .thumbnailUrl(o.getOrdersThumbnail())
                .build();
    }
    private long toLong(Object x) {
        if (x == null) return 0L;
        if (x instanceof Object[] arr) {           // ← 배열이 오면 첫 칸 꺼내서 재시도
            if (arr.length == 0 || arr[0] == null) return 0L;
            x = arr[0];
        }
        return ((Number) x).longValue();           // BigDecimal/Long/Integer 전부 OK
    }

    // 특정 회원의 계산서(주문서) 목록 요약 보기
    @Override
    public ReadAllOrdersRes getSummariesByMember(String memberId, Pageable pageable) {
        // findByMemberId로 해당 회원의 주문서들만 페이징 조회.
        // 나머지 구성은 전체 목록과 동일(요약 라인 매핑 + 페이징 메타).
        if (memberId == null || memberId.isBlank())
            throw new IllegalArgumentException("memberId는 비워둘 수 없습니다.");
        if (pageable == null)
            throw new IllegalArgumentException("pageable은 비워둘 수 없습니다.");

        Page<OrdersEntity> page = ordersRepository.findByMemberId_MemberId(memberId, pageable);

        // DTO로 변환
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


    // Entity -> DTO 변환
    private AddressDTO toAddressDTO(AddressEntity a) {
        if (a == null) return null;
        return AddressDTO.builder()
                .zipcode(a.getZipcode())
                .street(a.getStreet())
                .detail(a.getDetail())
                .receiver(a.getReceiver())
                .phone(a.getPhone())
                .build();
    }


    // 상세 DTO (헤더 + 라인)
    private ReadOneOrdersRes toReadOneOrdersRes(OrdersEntity o) {
        // 주문 품목을 DTO로 변환
        List<OrderDTO> lines = (o.getOrderItems() == null) ? List.of()
                : o.getOrderItems().stream().map(this::toOrderLineDTO).toList();

        // DB 집계로 금액 계산
        int shippingFee = o.getShippingFee();
        int totalAmount = o.getTotalAmount();
        int itemsSubtotal = totalAmount - shippingFee;

        return ReadOneOrdersRes.builder()
                .ordersId(o.getOrdersId())  // 주문 ID
                .memberId(o.getMemberId() != null ? o.getMemberId().getMemberId() : null)  // 엔티티 대신 회원ID만 노출
                .cardId(o.getCardId())      // 카드 ID
                .itemsSubtotal(itemsSubtotal)   // 물건값
                .shippingFee(shippingFee)       // 배송비
                .totalAmount(totalAmount)       // 총 금액
                .status(o.getStatus())
                .shippingAddress(toAddressDTO(o.getShippingAddress()))  // 배송지
                .thumbnailUrl(firstImageUrlFromHeader(o))
                .ordersItems(lines) // 품목 리스트
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
                .itemQuantity(itemQty)          // 총 수량
                .itemsSubtotal(subtotal)        // 물건값
                .shippingFee(shipping)          // 배송비
                .totalAmount(grandTotal)        // 총 금액
                .status(o.getStatus())
                .thumbnailUrl(firstImageUrlFromHeader(o))
                .build();
    }

    // 주문 품목 DTO로 변환
    private OrderDTO toOrderLineDTO(OrderEntity e) {
        return OrderDTO.builder()
                .orderId(e.getOrderId())
                .itemId(e.getItem() != null ? e.getItem().getItemId() : null)
                .name(e.getItem() != null ? e.getItem().getItemName() : null) // ★ 추가
                .price(e.getPrice())
                .quantity(e.getQuantity())
                .thumbnailUrl(firstImageUrl(e))
                .build();
    }

    // 라인 아이템의 첫 번째 이미지 URL 반환
    private String firstImageUrl(OrderEntity line) {
        if (line == null || line.getItem() == null) return null;
        var images = line.getItem().getImages();
        if (images == null || images.isEmpty()) return null;

        return images.get(0).getUrl();
    }

    // 주문 헤더 기준 첫 번째 라인의 첫 이미지 반환
    private String firstImageUrlFromHeader(OrdersEntity orders) {
        // ★ CHANGED: 첫 라인만 보지 말고, 이미지가 있는 첫 라인을 순회 탐색
        if (orders.getOrderItems() == null || orders.getOrderItems().isEmpty()) return null;
        for (OrderEntity li : orders.getOrderItems()) {
            String u = firstImageUrl(li);
            if (u != null && !u.isBlank()) return u;
        }
        return null;
    }

    // 배송지
    private AddressEntity toAddressEntity(AddressDTO dto) {
        if (dto == null) return null;
        return AddressEntity.builder()
                .zipcode(dto.getZipcode())
                .street(dto.getStreet())
                .detail(dto.getDetail())
                .receiver(dto.getReceiver())
                .phone(dto.getPhone())
                .build();
    }






}