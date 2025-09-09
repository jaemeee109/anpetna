package com.anpetna.item;

import com.anpetna.core.coreDto.PageRequestDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.domain.ReviewEntity;
import com.anpetna.item.dto.ReviewDTO;
import com.anpetna.item.dto.deleteReview.DeleteReviewReq;
import com.anpetna.item.dto.deleteReview.DeleteReviewRes;
import com.anpetna.item.dto.modifyReview.ModifyReviewReq;
import com.anpetna.item.dto.modifyReview.ModifyReviewRes;
import com.anpetna.item.dto.registerReview.RegisterReviewReq;
import com.anpetna.item.dto.registerReview.RegisterReviewRes;
import com.anpetna.item.dto.searchOneReview.SearchOneReviewReq;
import com.anpetna.item.dto.searchOneReview.SearchOneReviewRes;
import com.anpetna.item.repository.ItemRepository;
import com.anpetna.item.repository.ReviewRepository;
import com.anpetna.item.service.ReviewServiceImpl;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class ReviewServiceImplIT {

    @Autowired ReviewServiceImpl reviewService; // 실제 서비스 구현을 사용
    @Autowired ReviewRepository reviewRepository;
    @Autowired ItemRepository itemRepository;
    @Autowired MemberRepository memberRepository;
    @Autowired EntityManager em;

    /** ====== 공통 유틸 ====== */

    private void setAuth(String memberId, String... roles) {
        var auth = new UsernamePasswordAuthenticationToken(
                memberId, "pw",
                Arrays.stream(roles).map(SimpleGrantedAuthority::new).toList()
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    /** 엔티티의 @Column(nullable=false) 등을 리플렉션으로 스캔해서 더미 값 자동 채움 */
    private void fillRequiredFields(Object entity) {
        Class<?> cls = entity.getClass();
        while (cls != null && !cls.equals(Object.class)) {
            for (Field f : cls.getDeclaredFields()) {
                try {
                    f.setAccessible(true);
                    Object cur = f.get(entity);

                    // 연관관계(다른 엔티티 타입)나 컬렉션은 스킵 (필요하면 개별 테스트에서 직접 세팅)
                    if (cur != null) continue;
                    if (Collection.class.isAssignableFrom(f.getType())) continue;
                    if (f.getType().getName().endsWith("Entity")) continue;

                    // primitive면 기본값 유지
                    if (f.getType().isPrimitive()) continue;

                    // Enum: 첫번째 상수로
                    if (f.getType().isEnum()) {
                        Object[] constants = f.getType().getEnumConstants();
                        if (constants != null && constants.length > 0) f.set(entity, constants[0]);
                        continue;
                    }

                    // 타입별 더미값
                    if (f.getType().equals(String.class)) {
                        f.set(entity, "dummy_" + f.getName());
                    } else if (Number.class.isAssignableFrom(f.getType())) {
                        f.set(entity, 1);
                    } else if (f.getType().equals(LocalDate.class)) {
                        f.set(entity, LocalDate.of(2000, 1, 1));
                    } else if (f.getType().equals(LocalDateTime.class)) {
                        f.set(entity, LocalDateTime.now());
                    } else if (f.getType().equals(Boolean.class)) {
                        f.set(entity, Boolean.TRUE);
                    } else if (f.getType().equals(BigDecimal.class)) {
                        f.set(entity, BigDecimal.ONE);
                    }
                } catch (Exception ignore) {}
            }
            cls = cls.getSuperclass();
        }
    }

    private MemberEntity createAndSaveMember(String memberId) {
        MemberEntity m = new MemberEntity();
        // 필수: PK 세팅 (네 서비스는 auth.getName() == memberId)
        invokeSetter(m, "setMemberId", String.class, memberId);
        // 나머지 NOT NULL 필드 자동 채우기
        fillRequiredFields(m);
        m = memberRepository.save(m);
        return m;
    }

    private ItemEntity createAndSaveItem() {
        ItemEntity it = new ItemEntity();
        // latest_date 필요 시
        try {
            ItemEntity.class.getMethod("setLatestDate", LocalDateTime.class)
                    .invoke(it, LocalDateTime.now());
        } catch (NoSuchMethodException ignored) {
            // BaseEntity @PrePersist로 처리되는 경우
        } catch (Exception e) {
            throw new RuntimeException("latestDate 세팅 실패", e);
        }

        it.setItemName("dummy_name");
        it.setItemDetail("dummy_detail");
        it.setItemPrice(1000);
        it.setItemStock(10);
        it.setItemCategory(com.anpetna.item.constant.ItemCategory.FEED);
        it.setItemSellStatus(com.anpetna.item.constant.ItemSellStatus.SELL);
        it.setItemSaleStatus(0);

        return itemRepository.save(it);
    }



    private static void invokeSetter(Object target, String method, Class<?> pType, Object val) {
        try {
            target.getClass().getMethod(method, pType).invoke(target, val);
        } catch (Exception ignore) {}
    }

    /** ====== 테스트 시작 ====== */

    @BeforeEach
    void setup() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void register_modify_delete_flow_success() {
        // 로그인 사용자
        String me = "userA";
        setAuth(me, "ROLE_USER");

        // 1) 멤버/아이템 더미 생성 (실제 엔티티 @Column(nullable=false) 자동 충족)
        MemberEntity member = createAndSaveMember(me);
        ItemEntity item = createAndSaveItem();
        Long itemId = getItemId(item);

        // 2) 등록
        RegisterReviewReq regReq = RegisterReviewReq.builder()
                .content("처음 후기")
                .rating(5)
                // regDate/itemId는 서비스에서 서버강제/엔티티연관으로 세팅하므로 여기선 생략 가능
                .build();
        RegisterReviewRes regRes = reviewService.registerReview(itemId, regReq);
        assertNotNull(regRes);

        // DB에 실제로 생겼는지 확인
        List<ReviewEntity> all = reviewRepository.findAll();
        assertFalse(all.isEmpty());
        ReviewEntity created = all.get(0);
        Long reviewId = getReviewId(created);
        assertEquals("처음 후기", getContent(created));
        assertEquals(me, Optional.ofNullable(created.getMemberId()).map(this::getMemberId).orElse(null));
        assertEquals(itemId, Optional.ofNullable(created.getItemId()).map(this::getItemId).orElse(null));

        // 3) 단건 조회
        SearchOneReviewReq sReq = new SearchOneReviewReq();
        sReq.setReviewId(reviewId);
        SearchOneReviewRes one = reviewService.getOneReview(sReq);
        assertNotNull(one);
        // 필드 검증은 네 DTO 구조에 맞춰 필요한 만큼만
        // assertEquals(reviewId, one.getReviewId());  // 게터가 공개되어 있으면 사용

        // 4) 수정 (owner)
        ModifyReviewReq modReq = ModifyReviewReq.builder()
                .reviewId(reviewId)
                .content("수정된 내용")
                .rating(4)
                .itemId(itemId) // 바디-경로 일치 요구사항 충족을 위해 포함
                .build();

        ModifyReviewRes modRes = reviewService.modifyReview(itemId, reviewId, modReq);
        assertNotNull(modRes);

        ReviewEntity updated = reviewRepository.findById(reviewId).orElseThrow();
        assertEquals("수정된 내용", getContent(updated));
        // 연관은 그대로
        assertEquals(itemId, Optional.ofNullable(updated.getItemId()).map(this::getItemId).orElse(null));
        assertEquals(me, Optional.ofNullable(updated.getMemberId()).map(this::getMemberId).orElse(null));

        // 5) 목록 정렬 (날짜 / 평점)
        var pageReq = new PageRequestDTO(); // 네 프로젝트 PageRequestDTO 기본값을 사용
        var searchReq = new com.anpetna.item.dto.searchAllReview.SearchAllReviewsReq();
        // SearchAllReviewsReq: 필수 itemId만 세팅
        try {
            searchReq.getClass().getMethod("setItemId", Long.class).invoke(searchReq, itemId);
        } catch (Exception ignore) {}

        PageResponseDTO<ReviewDTO> byDate = reviewService.getAllReviews(searchReq, pageReq, "date");
        assertNotNull(byDate);
        PageResponseDTO<ReviewDTO> byRating = reviewService.getAllReviews(searchReq, pageReq, "rating");
        assertNotNull(byRating);

        // 6) 삭제 (owner)
        DeleteReviewReq delReq = new DeleteReviewReq();
        invokeSetter(delReq, "setReviewId", Long.class, reviewId);

        DeleteReviewRes delRes = reviewService.deleteReview(itemId, delReq);
        assertNotNull(delRes);
        assertTrue(reviewRepository.findById(reviewId).isEmpty());
    }

    @Test
    void modify_forbidden_whenOtherUser() {
        // A가 작성
        setAuth("author", "ROLE_USER");
        MemberEntity author = createAndSaveMember("author");
        ItemEntity item = createAndSaveItem();
        Long itemId = getItemId(item);

        RegisterReviewReq regReq = RegisterReviewReq.builder()
                .content("원본")
                .rating(5)
                .build();
        RegisterReviewRes regRes = reviewService.registerReview(itemId, regReq);
        assertNotNull(regRes);
        ReviewEntity created = reviewRepository.findAll().get(0);
        Long reviewId = getReviewId(created);

        // B로 로그인 바꾸고 수정 시도 → 403 기대
        setAuth("intruder", "ROLE_USER");
        ModifyReviewReq modReq = ModifyReviewReq.builder()
                .reviewId(reviewId)
                .content("침입자 수정")
                .rating(1)
                .itemId(itemId)
                .build();

        var ex = assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> reviewService.modifyReview(itemId, reviewId, modReq));
        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    /** ====== 리플렉션 헬퍼 (엔티티 getter 대응) ====== */

    private Long getItemId(ItemEntity item) {
        try {
            return (Long) ItemEntity.class.getMethod("getItemId").invoke(item);
        } catch (Exception e) { throw new RuntimeException(e); }
    }

    private Long getReviewId(ReviewEntity r) {
        try {
            return (Long) ReviewEntity.class.getMethod("getReviewId").invoke(r);
        } catch (Exception e) { throw new RuntimeException(e); }
    }

    private String getMemberId(MemberEntity m) {
        try {
            return (String) MemberEntity.class.getMethod("getMemberId").invoke(m);
        } catch (Exception e) { throw new RuntimeException(e); }
    }

    private String getContent(ReviewEntity r) {
        try {
            return (String) ReviewEntity.class.getMethod("getContent").invoke(r);
        } catch (Exception e) { throw new RuntimeException(e); }
    }
}
