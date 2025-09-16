package com.anpetna.item;

import com.anpetna.core.coreDto.PageRequestDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.item.config.ReviewMapper;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.domain.ReviewEntity;
import com.anpetna.item.dto.ReviewDTO;
import com.anpetna.item.dto.modifyReview.ModifyReviewReq;
import com.anpetna.item.dto.registerReview.RegisterReviewReq;
import com.anpetna.item.dto.registerReview.RegisterReviewRes;
import com.anpetna.item.dto.searchAllReview.SearchAllReviewsReq;
import com.anpetna.item.dto.searchOneReview.SearchOneReviewReq;
import com.anpetna.item.dto.searchOneReview.SearchOneReviewRes;
import com.anpetna.item.repository.ItemRepository;
import com.anpetna.item.repository.ReviewRepository;
import com.anpetna.item.service.ReviewServiceImpl;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;
import org.hibernate.query.SortDirection;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.modelmapper.TypeMap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import static org.mockito.Mockito.*;  // when, verify, any, eq 등
import static org.junit.jupiter.api.Assertions.*;  // assertEquals, assertNotNull 등


@ExtendWith(MockitoExtension.class)
public class ReviewServiceTest {

    @Mock
    ReviewRepository reviewRepository;
    @Mock
    ItemRepository itemRepository;
    @Mock
    MemberRepository memberRepository;
    @Mock
    ModelMapper modelMapper;
    @Mock
    ReviewMapper reviewMapper;

    // TypeMap 들도 목으로 사용 (ModelMapper 내부 map 호출을 대체)
    @Mock
    TypeMap<RegisterReviewReq, ReviewEntity> cTypeMap;
    @Mock
    TypeMap<ModifyReviewReq, ReviewEntity> uTypeMap;
    @Mock
    TypeMap<ReviewEntity, SearchOneReviewRes> r1TypeMap;
    @Mock
    TypeMap<ReviewEntity, ReviewDTO> rListTypeMap;

    @InjectMocks
    ReviewServiceImpl service;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void setAuth(String memberId, String... roles) {
        var auth = new UsernamePasswordAuthenticationToken(
                memberId, "pw",
                java.util.Arrays.stream(roles).map(SimpleGrantedAuthority::new).toList()
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void registerReview_success() {
        Long itemId = 1L;
        String memberId = "userA";
        setAuth(memberId, "ROLE_USER");

        // === Stubbing ===
        // 아이템/멤버
        when(itemRepository.findById(anyLong())).thenReturn(Optional.of(new ItemEntity()));
        when(memberRepository.findById(anyString())).thenReturn(Optional.of(new MemberEntity()));

        // 매퍼 (req -> entity)
        when(reviewMapper.cReviewMapReq()).thenReturn(
                new ModelMapper().createTypeMap(RegisterReviewReq.class, ReviewEntity.class)
        );

        // 저장될 리뷰 엔티티
        ReviewEntity savedEntity = new ReviewEntity();
        savedEntity.setReviewId(100L);
        when(reviewRepository.save(any(ReviewEntity.class))).thenReturn(savedEntity);

        // 엔티티 -> 응답 DTO 매핑
        RegisterReviewRes mockRes = new RegisterReviewRes();
        when(modelMapper.map(any(ReviewEntity.class), eq(RegisterReviewRes.class))).thenReturn(mockRes);

        // === 실행 ===
        RegisterReviewReq req = RegisterReviewReq.builder()
                .content("테스트 리뷰")
                .rating(5)
                .build();

        RegisterReviewRes res = service.registerReview(itemId, req);

        // === 검증 ===
        assertNotNull(res);
        verify(reviewRepository).save(any(ReviewEntity.class));
    }


    @Test
    void modifyReview_forbidden_whenNotOwnerAndNotAdmin() {
        // given
        Long itemId = 10L;
        Long reviewId = 100L;
        setAuth("intruder", "ROLE_USER");

        // body
        var req = ModifyReviewReq.builder()
                .reviewId(reviewId)
                .content("침입자 수정")
                .rating(1)
                .itemId(itemId)
                .build();

        // uReviewMapReq().map(req) -> incoming(reviewId 채워짐)
        when(reviewMapper.uReviewMapReq()).thenReturn(uTypeMap);
        ReviewEntity incoming = new ReviewEntity();
        incoming.setReviewId(reviewId);
        when(uTypeMap.map(req)).thenReturn(incoming);

        // repo.findById(reviewId) -> 원본은 author가 작성
        ReviewEntity found = new ReviewEntity();
        var author = new MemberEntity();
        // getMemberId()가 author를 반환하도록 세팅 필요할 수 있으나, equals는 id로 비교하므로
        // 여기선 간단히 memberId 엔티티 안의 PK가 "author" 라 가정 로직 대신,
        // service의 권한 체크는 me.equals(found.getMemberId().getMemberId())
        // -> getMemberId().getMemberId() 가 "author" 라야 함
        setMemberId(author, "author"); // 아래 헬퍼로 필드 세팅
        found.setMemberId(author);

        var foundItem = new ItemEntity();
        setItemId(foundItem, itemId);
        found.setItemId(foundItem);

        when(reviewRepository.findById(reviewId)).thenReturn(Optional.of(found));

        // when & then
        var ex = assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.modifyReview(itemId, reviewId, req));
        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, ex.getStatusCode());
        verify(reviewRepository, never()).save(any());
    }

    @Test
    void searchOneReview_success() {
        // given
        Long reviewId = 200L;

        ReviewEntity entity = new ReviewEntity();
        entity.setReviewId(reviewId);
        when(reviewRepository.findById(reviewId)).thenReturn(Optional.of(entity));

        when(reviewMapper.r1ReviewMapRes()).thenReturn(r1TypeMap);
        SearchOneReviewRes dto = mock(SearchOneReviewRes.class);
        when(r1TypeMap.map(entity)).thenReturn(dto);

        var req = new SearchOneReviewReq();
        req.setReviewId(reviewId);

        // when
        SearchOneReviewRes res = service.getOneReview(req);

        // then
        assertNotNull(res);
        verify(reviewRepository).findById(reviewId);
        verify(r1TypeMap).map(entity);
    }

    @Test
    void getAllReviews_sortByRating_desc_default() {
        // given
        Long itemId = 10L;
        var pageReq = new PageRequestDTO(); // 페이지/사이즈 기본값 사용
        var pageable = pageReq.getPageable("rating", "regDate");

        var searchReq = new SearchAllReviewsReq();
        searchReq.setItemId(itemId);
        searchReq.setDirection(null); // null이면 DESC 로 처리하는 로직

        ReviewEntity e1 = new ReviewEntity();
        Page<ReviewEntity> page = new PageImpl<>(List.of(e1), pageable, 1);

        when(reviewRepository.findByRating(eq(itemId), eq(SortDirection.DESCENDING), any(Pageable.class)))
                .thenReturn(page);

        when(reviewMapper.rReviewMapRes()).thenReturn(rListTypeMap);
        ReviewDTO mapped = new ReviewDTO();
        when(rListTypeMap.map(e1)).thenReturn(mapped);

        // when
        PageResponseDTO<ReviewDTO> result = service.getAllReviews(searchReq, pageReq, "rating");

        // then
        assertNotNull(result);
        assertEquals(1, result.getDtoList().size());
        verify(reviewRepository).findByRating(eq(itemId), eq(SortDirection.DESCENDING), any(Pageable.class));
    }

    // ======= 헬퍼: 리플렉션으로 id 필드 채우기 (MemberEntity.getMemberId()/ItemEntity.getItemId() 대비) =======
    private void setMemberId(MemberEntity member, String id) {
        try {
            var f = MemberEntity.class.getDeclaredField("memberId");
            f.setAccessible(true);
            f.set(member, id);
        } catch (Exception e) {
            // 프로젝트의 MemberEntity 필드명이 다르면 여기 조정
            throw new RuntimeException("MemberEntity.memberId 필드 세팅 실패 - 필드명 확인 필요", e);
        }
    }

    private void setItemId(ItemEntity item, Long id) {
        try {
            var f = ItemEntity.class.getDeclaredField("itemId");
            f.setAccessible(true);
            f.set(item, id);
        } catch (Exception e) {
            // 프로젝트의 ItemEntity 필드명이 다르면 여기 조정
            throw new RuntimeException("ItemEntity.itemId 필드 세팅 실패 - 필드명 확인 필요", e);
        }
    }

    @Test
    void deleteReview_success_whenOwner() {
        // given
        Long itemId = 10L;
        Long reviewId = 200L;
        String me = "author";
        setAuth(me, "ROLE_USER");

        // 원본 리뷰 엔티티
        ReviewEntity found = new ReviewEntity();
        setItemId(new ItemEntity(), itemId);
        found.setReviewId(reviewId);

        MemberEntity member = new MemberEntity();
        setMemberId(member, me);
        found.setMemberId(member);

        ItemEntity item = new ItemEntity();
        setItemId(item, itemId);
        found.setItemId(item);

        when(reviewRepository.findById(reviewId)).thenReturn(Optional.of(found));

        // when
        var req = new com.anpetna.item.dto.deleteReview.DeleteReviewReq();
        req.setReviewId(reviewId);
        var res = service.deleteReview(itemId, req);

        // then
        assertNotNull(res);
        verify(reviewRepository).delete(found);
    }


}
