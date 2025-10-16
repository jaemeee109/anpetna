package com.anpetna.item.service;

import com.anpetna.core.coreDto.PageRequestDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.image.domain.ImageEntity;
import com.anpetna.image.service.FileService;
import com.anpetna.item.config.ReviewMapper;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.domain.ReviewEntity;
import com.anpetna.item.dto.ReviewDTO;
import com.anpetna.item.dto.deleteReview.DeleteReviewReq;
import com.anpetna.item.dto.deleteReview.DeleteReviewRes;
import com.anpetna.item.dto.modifyReview.ModifyReviewReq;
import com.anpetna.item.dto.modifyReview.ModifyReviewRes;
import com.anpetna.item.dto.registerReview.RegisterReviewReq;
import com.anpetna.item.dto.registerReview.RegisterReviewRes;
import com.anpetna.item.dto.searchAllReview.SearchAllReviewsReq;
import com.anpetna.item.dto.searchOneReview.SearchOneReviewReq;
import com.anpetna.item.dto.searchOneReview.SearchOneReviewRes;
import com.anpetna.item.repository.ItemRepository;
import com.anpetna.item.repository.ReviewRepository;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;
import com.anpetna.order.constant.OrdersStatus;
import com.anpetna.order.domain.OrdersEntity;
import com.anpetna.order.repository.OrderRepository;
import com.anpetna.order.repository.OrdersRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.hibernate.query.SortDirection;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

//  item(ONE)을 등록하면 image(MANY)가 등록
//  review(ONE)을 등록하면 item(ONE)가 등록
//  item(ONE)를 조회하면 관련된 review(MANY)가 조회 (회우너이 본인 정보 조회하는 것과 비슷한 맥락)
@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final ModelMapper modelMapper;
    private final ReviewMapper reviewMapper;
    private final ItemRepository itemRepository;
    private final MemberRepository memberRepository;
    private final FileService fileService;
    private final OrdersRepository ordersRepository;
    private final OrderRepository orderRepository;

    @Override
    @Transactional
    public RegisterReviewRes registerReview(Long itemId, RegisterReviewReq req, MultipartFile image) {
        // 1) 로그인 사용자 식별
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        String memberId = auth.getName();

        // 2) 필수 연관 엔티티 로드
        ItemEntity item = itemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Item not found"));
        MemberEntity member = memberRepository.findById(memberId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found"));

        // 2-1) 주문서 로드 + 소유자 검증
        if (req.getOrdersId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ordersId는 필수입니다.");
        }
        OrdersEntity orders = ordersRepository
                .findByOrdersIdAndMemberId_MemberId(req.getOrdersId(), memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 주문이 아닙니다."));

        // 2-2) 상태: 구매확정(CONFIRMATION)만 허용
        if (orders.getStatus() != OrdersStatus.CONFIRMATION) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "구매확정 상태에서만 리뷰 작성 가능합니다.");
        }

        // 2-3) 주문서에 해당 itemId 포함 여부 확인
        boolean containsItem = orderRepository.existsByOrders_OrdersIdAndItem_ItemId(orders.getOrdersId(), itemId);
        if (!containsItem) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "해당 주문서에 이 상품이 포함되어 있지 않습니다.");
        }

        // 2-4) 중복 방지 (정책 A: 회원×아이템 1회)
        boolean dup = reviewRepository.existsByMemberId_MemberIdAndItemId_ItemId(memberId, itemId);
        if (dup) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 이 상품에 대한 리뷰를 작성하셨습니다.");
        }

        // 3) 요청 DTO -> 엔티티 매핑 (네 매퍼 그대로 사용)
        ReviewEntity reqEntity = reviewMapper.cReviewMapReq().map(req);

        // 4) 신뢰할 수 없는 필드 오버라이드(보안): 반드시 서버에서 지정
        reqEntity.setItemId(item);
        reqEntity.setMemberId(member);
        reqEntity.setRegDate(java.time.LocalDateTime.now());

        if (image != null && !image.isEmpty()) {
            try {
                // 1) 스토리지 업로드 → 메타 정보(ImageDTO 등) 수령
                var uploaded = fileService.uploadFile(image, 0); // sortOrder=0 고정

                // 2) 업로드 메타를 DB 엔티티로 변환
                ImageEntity img = modelMapper.map(uploaded, ImageEntity.class);

                // 2-1) 혹시 매핑에 없는 필드 보정 (필요 시만)
                if (img.getSortOrder() == null) img.setSortOrder(0);

                // 3) 리뷰↔이미지 연결 (1:1)
                reqEntity.setImage(img);

            } catch (Exception e) {
                System.out.println("image upload failed");
            }
        }


        // 5) 저장
        ReviewEntity saved = reviewRepository.save(reqEntity);

        // 6) 응답 매핑 (네 규격 유지)
        RegisterReviewRes res = modelMapper.map(saved, RegisterReviewRes.class);
        return res.registered();
    }


    @Override
    @Transactional
    public ModifyReviewRes modifyReview(Long itemId, Long reviewId, ModifyReviewReq req, MultipartFile image) {
        // 1) 인증 확인
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        String me = auth.getName();

        // 2) req -> 임시 엔티티로 매핑해서 PK만 추출 (필드 추측하지 않음)
        ReviewEntity incoming = reviewMapper.uReviewMapReq().map(req);
        if (incoming.getReviewId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "reviewId는 필수입니다.");
        }

        // req -> incoming 매핑 직후
        if (!reviewId.equals(incoming.getReviewId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Path reviewId와 body reviewId가 다릅니다.");
        }
        // 그리고 조회도 path 기준으로
        ReviewEntity found = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new EntityNotFoundException("Review not found"));

        // 4) 경로의 itemId와 실제 리뷰 소속 검증
        if (found.getItemId() == null || !found.getItemId().getItemId().equals(itemId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 아이템의 리뷰가 아닙니다.");
        }

        // 5) 권한: 작성자 또는 관리자
        boolean isOwner = (found.getMemberId() != null) && me.equals(found.getMemberId().getMemberId());
        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        if (!isOwner && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "권한이 없습니다.");
        }

        // 6) 변경 적용: 허용된 필드만 업데이트되도록 기존 엔티티에 '덮어쓰기'
        //    (uReviewMapReq가 TypeMap<ModifyReviewReq, ReviewEntity>라면, 아래처럼 대상에 매핑 가능)
        var originalItem   = found.getItemId();   // 소속 고정
        var originalMember = found.getMemberId(); // 작성자 고정

        reviewMapper.uReviewMapReq().map(req, found);

        // 안전장치: 클라가 item/member를 바꾸려 해도 원래 값 유지
        found.setItemId(originalItem);
        found.setMemberId(originalMember);

        // =========================
        // ★ 추가: 이미지 삭제 플래그 처리
        //  - 프론트가 removeImage=true 를 보내고, 새 파일 업로드(image)가 없을 때
        //    기존 이미지를 삭제(물리 파일 삭제 시도 후 연관 해제)합니다.
        // =========================
        boolean wantRemove = Boolean.TRUE.equals(req.getRemoveImage()); // ★ 추가
        if (wantRemove && (image == null || image.isEmpty())) {         // ★ 추가
            if (found.getImage() != null && found.getImage().getUrl() != null) { // ★ 추가
                try {                                                    // ★ 추가
                    fileService.deleteFile(found.getImage().getUrl());  // ★ 추가 (물리 파일 정리 시도)
                } catch (Exception ignore) {}                            // ★ 추가
            }                                                            // ★ 추가
            found.setImage(null);                                        // ★ 추가 (연관 해제 → orphanRemoval이면 DB row도 제거)
        }                                                                // ★ 추가

        if (image != null && !image.isEmpty()) {
            try {
                // 1) 기존 물리 파일 삭제
                if (found.getImage() != null && found.getImage().getUrl() != null) {
                    try { fileService.deleteFile(found.getImage().getUrl()); } catch (Exception ignore) {}
                }

                // 2) 새 업로드
                var uploaded = fileService.uploadFile(image, 0);

                // 3) 기존 ImageEntity 재사용 or 새로 교체 (택1)
                if (found.getImage() != null) {
                    // (A) 재사용: 필드만 업데이트
                    found.getImage().setUrl(uploaded.getUrl());
                    // found.getImage().setOriginalName(uploaded.getOriginalName()); ...
                    found.getImage().setSortOrder(0);
                } else {
                    // (B) 새 엔티티로 교체
                    ImageEntity img = modelMapper.map(uploaded, ImageEntity.class);
                    if (img.getSortOrder() == null) img.setSortOrder(0);
                    found.setImage(img);
                    // (양방향이면) img.setReview(found);
                }
            } catch (Exception e) {
                System.out.println("image replace failed");
            }
        }

        // 7) 저장
        ReviewEntity saved = reviewRepository.save(found);

        // 8) 응답 매핑 (네 규격 유지)
        ModifyReviewRes res = modelMapper.map(saved, ModifyReviewRes.class);
        return res.modified();
    }


    @Override
    @Transactional
    public DeleteReviewRes deleteReview(Long itemId, DeleteReviewReq req) {
        // 0) 파라미터 체크
        if (req.getReviewId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "reviewId는 필수입니다.");
        }

        // 1) 인증 확인
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        String me = auth.getName();

        // 2) 원본 로드
        ReviewEntity found = reviewRepository.findById(req.getReviewId())
                .orElseThrow(() -> new EntityNotFoundException("Review not found"));

        // 3) 소속 아이템 검증
        if (found.getItemId() == null || !found.getItemId().getItemId().equals(itemId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 아이템의 리뷰가 아닙니다.");
        }

        // 4) 권한: 작성자 또는 관리자
        boolean isOwner = (found.getMemberId() != null) && me.equals(found.getMemberId().getMemberId());
        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        if (!isOwner && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "권한이 없습니다.");
        }

        // (리뷰 삭제 직전)
        if (found.getImage() != null) {
            // 1) 물리 파일 먼저 삭제
            String url = found.getImage().getUrl();
            if (url != null && !url.isBlank()) {
                try {
                    fileService.deleteFile(url);
                } catch (Exception ignore) { /* 실패해도 리뷰 삭제는 진행 */ }
            }
            found.setImage(null);
        }
        reviewRepository.delete(found);
        
        // 6) 응답
        DeleteReviewRes res = DeleteReviewRes.builder()
                .reviewId(req.getReviewId())
                .build();
        return res.deleted();
    }

    @Override
    public SearchOneReviewRes getOneReview(SearchOneReviewReq req) {
        ReviewEntity entity = reviewRepository.findById(req.getReviewId())
                .orElseThrow(() -> new EntityNotFoundException("Review not found"));
        return reviewMapper.r1ReviewMapRes().map(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<ReviewDTO> getAllReviews(SearchAllReviewsReq req, PageRequestDTO pageRequestDTO, String order) {

        if (req.getItemId() == null) {
            throw new IllegalArgumentException("ItemId is required");
        }

        Pageable pageable = pageRequestDTO.getPageable("rating", "regDate");

        SortDirection sortDirection = (req.getDirection() == null)
                ? SortDirection.DESCENDING
                : req.getDirection();

        Page<ReviewEntity> page;
        if ("rating".equalsIgnoreCase(order)) {
            page = reviewRepository.findByRating(req.getItemId(), sortDirection, pageable);
        }else {
            page = reviewRepository.findByRegDate(req.getItemId(), sortDirection, pageable);
        }

        Page<ReviewDTO> mapped = page.map(e -> reviewMapper.rReviewMapRes().map(e));

        return new PageResponseDTO<>(mapped, pageable);
    }


}
