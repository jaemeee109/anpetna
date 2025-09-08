//package com.anpetna.order.service;
//
//import com.anpetna.image.domain.ImageEntity;
//import com.anpetna.order.domain.OrderEntity;
//import com.anpetna.order.repository.OrderRepository;
//import lombok.RequiredArgsConstructor;
//
//import org.springframework.data.domain.Page;
//import org.springframework.data.domain.Pageable;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//
//import java.util.Comparator;
//import java.util.List;
//
//
//@Service
//@RequiredArgsConstructor
//@Transactional(readOnly = true)
//public class OrderServiceImpl implements OrderService {
//
//
//    private final OrderRepository orderRepository;
//
//
//    // 특정 주문서에 포함된 라인들을 페이지 단위로 가져옴 (결제창 목록 같은 화면에서 사용).
//    @Override
//    public Page<OrderEntity> getByOrdersId(Long ordersId, Pageable pageable) {
//        // 주문 ID 유효성 검사
//        validateOrdersId(ordersId);
//        if (pageable == null) {
//            throw new IllegalArgumentException("pageable은 비워둘 수 없습니다.");
//        }
//        // @EntityGraph 로 itemEntity + images 까지 함께 로딩
//        return orderRepository.findByOrders_OrdersId(ordersId, pageable);
//    }
//
//
//    // 특정 주문서에 포함된 모든 라인을 페이징 없이 전부 가져옴
//    @Override
//    public List<OrderEntity> getByOrdersId(Long ordersId) {
//        validateOrdersId(ordersId);
//        // @EntityGraph 로 itemEntity + images 까지 함께 로딩
//        return orderRepository.findByOrders_OrdersId(ordersId);
//    }
//
//
//    //주문서 안의 모든 라인들의 quantity 합계를 계산하여 총 몇개를 주문했는지 계산
//    @Override
//    public int getTotalQuantity(Long ordersId) {
//        validateOrdersId(ordersId);
//        // 전체 라인 로딩 후 quantity 합산
//
//
//        return orderRepository.sumQuantityByOrdersId(ordersId);
//    }
//
//
//    // 주문서 안의 모든 라인들의 (단가 × 수량) 합계를 계산하여 총 금액 계산
//    @Override
//    public int getTotalAmount(Long ordersId) {
//        validateOrdersId(ordersId);
//        // 전체 라인 로딩 후 (price * quantity) 합산
//
//        return orderRepository.sumAmountByOrdersId(ordersId);
//    }
//
//
//    //모든 메서드에서 공통으로 호출되는 입력값 검증 메서드
//    private void validateOrdersId(Long ordersId) {
//        if (ordersId == null || ordersId < 1) {
//            throw new IllegalArgumentException("ordersId는 1 이상의 값이어야 합니다.");
//        }
//    }
//
//
//
//// =================================================================================
////    private final OrderRepository orderRepository;
////
////    @Override
////    @Transactional(readOnly = true) // 트랜잭션은 읽기 전용: DB에 변경이 일어나지 않음을 스프링/하이버네이트에 알려줌(성능·안전)
////    public List<OrderEntity> getByOrdersId(Long ordersId) {
////
////        // 방어 코드(Guard Clause): 필수 파라미터가 비어 있으면 즉시 예외
////        if (ordersId == null) throw new IllegalArgumentException("ordersId는 비워둘 수 없습니다.");
////
////        // 리포지토리에서 "주문서(Orders)의 PK(ordersId)에 속한 주문 품목들(OrderEntity)"을 전부 조회
////        List<OrderEntity> lines = orderRepository.findByOrders_OrdersId(ordersId);
////
////        // 화면(결제창)에서 쓸 "썸네일 URL"만 각 품목에 계산해서 주입
////        // 엔티티의 DB 컬럼을 바꾸는 게 아니라, @Transient thumbnailUrl(응답용 필드)에 값만 세팅
////        for (OrderEntity oi : lines) {
////            // 1) 품목이 어떤 상품(Item)인지 가져오고
////            // 2) 그 상품에 달린 이미지 목록을 꺼냄 (상품이 없을 수도 있으니 null 안전 처리)
////            var images = (oi.getItemEntity() != null) ? oi.getItemEntity().getImages() : null;
////
////            // 3) "썸네일 선택 규칙"에 맞춰 하나 고르고, 그 URL을 품목의 thumbnailUrl에 세팅
////            oi.setThumbnailUrl(pickThumbUrl(images));
////        }
////
////        // 썸네일까지 주입된 품목 목록을 그대로 반환
////        return lines;
////
////        // 참고: 원래는 아래처럼 바로 반환했지만,
////        //       지금은 화면용 파생값(썸네일 URL)을 주입해야 해서 위처럼 변환 과정을 거칩니다.
////        // return orderRepository.findByOrders_OrdersId(ordersId);
////    }
////
////
//////     썸네일 선택 규칙(우선순위):
//////       1) sortOrder == 0 인 이미지가 있으면 그걸 썸네일로 사용
//////       2) 없으면 sortOrder 값이 가장 작은 이미지
//////       3) 그래도 못 고르면(이상 케이스) 목록의 첫 번째
//////
//////     @param images 해당 상품(Item)의 이미지 목록 (null/빈 리스트일 수도 있음)
//////     @return 대표(썸네일) 이미지의 URL, 없으면 null
////
////    private static String pickThumbUrl(List<ImageEntity> images) {
////        // 이미지가 없으면 썸네일도 없음
////        if (images == null || images.isEmpty()) return null;
////
////        // 1순위: sortOrder == 0 인 이미지 찾기
////        var pick = images.stream()
////                .filter(img -> Integer.valueOf(0).equals(img.getSortOrder()))
////                .findFirst()
////                .orElse(null);
////
////        // 2순위: 0이 없으면 sortOrder가 가장 작은 이미지(정렬순으로 대표 사진 가정)
////        if (pick == null) {
////            pick = images.stream()
////                    .min(Comparator.comparing(img ->
////                            // sortOrder가 null인 경우는 아주 큰값으로 취급해서 뒤로 밀어냄
////                            img.getSortOrder() == null ? Integer.MAX_VALUE : img.getSortOrder()))
////                    .orElse(null);
////        }
////
////        // 3순위: 그래도 없다면(이상 케이스) 첫 번째 이미지
////        if (pick == null) pick = images.get(0);
////
////        // 최종 선택이 있으면 URL 반환, 아니면 null
////        return pick != null ? pick.getUrl() : null;
////    }
////
////
////
////    @Override
////    @Transactional
////    public long deleteAllOrdersId(Long ordersId) {  // 전체 삭제
////
////        if(ordersId == null) throw new IllegalArgumentException("ordersId는 비워둘 수 없습니다.");
////        // 잘못된 입력에 대한 방어 로직
////
////        return orderRepository.deleteByOrders_OrdersId(ordersId);
////        // 삭제된 행 수를 리턴.
////    }
////
////    @Override
////    @Transactional
////    public void removeOrderItem(Long ordersId, Long orderItemId) {  // 한 개만 삭제
////
////        // 방어 로직
////        if(ordersId == null) throw new IllegalArgumentException("ordersId는 비워둘 수 없습니다.");
////        if(orderItemId == null) throw new IllegalArgumentException("ordersItemId는 비워둘 수 없습니다.");
////
////        // 삭제하려는 물품 한 건 로드(없으면 예외)
////        OrderEntity item = orderRepository.findById(orderItemId)
////                .orElseThrow(() -> new IllegalArgumentException("해당 품목을 찾을 수 없습니다 : " + orderItemId));
////
////        // 이 품목이 정말 전달받은 주문(ordersId)에 속해있는지 확인
////        if (!ordersId.equals(item.getOrders().getOrdersId())) {
////
////            throw new IllegalArgumentException("품목이 주문(" + ordersId + ")에 속해있지 않습니다.");
////
////        }
////
////        // 편의 메서드 사용 (OrdersEntity)
////        item.getOrders().removeOrderItem(item);
////
////    }
//
//
//}