package com.anpetna.notification;

import com.anpetna.board.constant.BoardType;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;
import com.anpetna.notification.feature.keyword.domain.KeywordSubscriptionEntity;
import com.anpetna.notification.feature.keyword.dto.CreateKeywordReq;
import com.anpetna.notification.feature.keyword.dto.DeleteKeywordRes;
import com.anpetna.notification.feature.keyword.dto.KeywordSubscriptionDTO;
import com.anpetna.notification.feature.keyword.dto.ListKeywordRes;
import com.anpetna.notification.feature.keyword.repository.KeywordSubscriptionRepository;
import com.anpetna.notification.feature.keyword.service.KeywordSubscriptionServiceImpl;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class KeywordSubscriptionServiceImplTest {

    @Mock
    KeywordSubscriptionRepository repo;

    @Mock
    MemberRepository memberRepository;

    @InjectMocks
    KeywordSubscriptionServiceImpl service;

    // ====== subscribe() ======
    @Test
    @DisplayName("구독 성공: 존재하지 않을 때 저장하고 DTO 반환")
    void subscribe_success() {
        // given
        String subscriberMemberId = "userA";
        CreateKeywordReq req = new CreateKeywordReq();
        req.setKeyword("강아지");
        req.setScopeBoardType(BoardType.FREE);

        MemberEntity subscriber = MemberEntity.builder().memberId(subscriberMemberId).build();

        when(memberRepository.findByMemberId(subscriberMemberId)).thenReturn(Optional.of(subscriber));
        when(repo.existsBySubscriber_MemberIdAndKeywordAndScopeBoardType(subscriberMemberId, "강아지", BoardType.FREE))
                .thenReturn(false);

        KeywordSubscriptionEntity saved = KeywordSubscriptionEntity.builder()
                .kId(10L)
                .subscriber(subscriber)
                .keyword("강아지")
                .scopeBoardType(BoardType.FREE)
                .build();

        when(repo.save(any(KeywordSubscriptionEntity.class))).thenReturn(saved);

        // when
        KeywordSubscriptionDTO dto = service.subscribe(subscriberMemberId, req);

        // then
        assertThat(dto.getKId()).isEqualTo(10L);
        assertThat(dto.getKeyword()).isEqualTo("강아지");
        assertThat(dto.getScopeBoardType()).isEqualTo(BoardType.FREE);
        assertThat(dto.getSubscriberMemberId()).isEqualTo(subscriberMemberId);

        // 저장 파라미터 검증
        ArgumentCaptor<KeywordSubscriptionEntity> cap = ArgumentCaptor.forClass(KeywordSubscriptionEntity.class);
        verify(repo).save(cap.capture());
        assertThat(cap.getValue().getSubscriber().getMemberId()).isEqualTo(subscriberMemberId);
        assertThat(cap.getValue().getKeyword()).isEqualTo("강아지");
        assertThat(cap.getValue().getScopeBoardType()).isEqualTo(BoardType.FREE);
    }

    @Test
    @DisplayName("구독 실패: 회원 없음 → EntityNotFoundException")
    void subscribe_member_not_found() {
        String subscriberMemberId = "ghost";
        CreateKeywordReq req = new CreateKeywordReq();
        req.setKeyword("고양이");
        when(memberRepository.findByMemberId(subscriberMemberId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.subscribe(subscriberMemberId, req))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    @DisplayName("구독 실패: 이미 존재 → IllegalStateException")
    void subscribe_duplicate_exists() {
        String subscriberMemberId = "userA";
        CreateKeywordReq req = new CreateKeywordReq();
        req.setKeyword("강아지");
        req.setScopeBoardType(null);

        MemberEntity subscriber = MemberEntity.builder().memberId(subscriberMemberId).build();
        when(memberRepository.findByMemberId(subscriberMemberId)).thenReturn(Optional.of(subscriber));
        when(repo.existsBySubscriber_MemberIdAndKeywordAndScopeBoardType(subscriberMemberId, "강아지", null))
                .thenReturn(true);

        assertThatThrownBy(() -> service.subscribe(subscriberMemberId, req))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already subscribed");
    }

    @Test
    @DisplayName("구독 실패: 저장 중 유니크 제약 위반 → IllegalStateException 변환")
    void subscribe_duplicate_on_save_throws_DataIntegrityViolationException() {
        String subscriberMemberId = "userA";
        CreateKeywordReq req = new CreateKeywordReq();
        req.setKeyword("강아지");
        req.setScopeBoardType(BoardType.FREE);

        MemberEntity subscriber = MemberEntity.builder().memberId(subscriberMemberId).build();
        when(memberRepository.findByMemberId(subscriberMemberId)).thenReturn(Optional.of(subscriber));
        when(repo.existsBySubscriber_MemberIdAndKeywordAndScopeBoardType(subscriberMemberId, "강아지", BoardType.FREE))
                .thenReturn(false);
        when(repo.save(any(KeywordSubscriptionEntity.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate"));

        assertThatThrownBy(() -> service.subscribe(subscriberMemberId, req))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already subscribed");
    }

    @Nested
    class SubscribeValidation {
        @Test
        @DisplayName("검증: subscriberMemberId null/blank → IllegalArgumentException")
        void subscriber_id_blank() {
            CreateKeywordReq req = new CreateKeywordReq();
            req.setKeyword("a");
            assertThatThrownBy(() -> service.subscribe(null, req))
                    .isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> service.subscribe("  ", req))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("검증: keyword null/blank → IllegalArgumentException")
        void keyword_blank() {
            String subscriberMemberId = "userA";
            assertThatThrownBy(() -> service.subscribe(subscriberMemberId, null))
                    .isInstanceOf(IllegalArgumentException.class);
            CreateKeywordReq req = new CreateKeywordReq();
            req.setKeyword("   ");
            assertThatThrownBy(() -> service.subscribe(subscriberMemberId, req))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    // ====== listByMember() ======
    @Test
    @DisplayName("내 구독 목록 조회")
    void listByMember_ok() {
        String subscriberMemberId = "userA";
        MemberEntity subscriber = MemberEntity.builder().memberId(subscriberMemberId).build();

        KeywordSubscriptionEntity e1 = KeywordSubscriptionEntity.builder()
                .kId(1L).subscriber(subscriber).keyword("강아지").scopeBoardType(null).build();
        KeywordSubscriptionEntity e2 = KeywordSubscriptionEntity.builder()
                .kId(2L).subscriber(subscriber).keyword("고양이").scopeBoardType(BoardType.FREE).build();

        when(repo.findBySubscriber_MemberId(subscriberMemberId))
                .thenReturn(List.of(e1, e2));

        ListKeywordRes res = service.listByMember(subscriberMemberId);

        assertThat(res.getItems()).hasSize(2);
        assertThat(res.getItems().get(0).getKId()).isEqualTo(1L);
        assertThat(res.getItems().get(1).getKeyword()).isEqualTo("고양이");
    }

    @Test
    @DisplayName("목록 조회 검증: subscriberMemberId null/blank → IllegalArgumentException")
    void listByMember_blank() {
        assertThatThrownBy(() -> service.listByMember(null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.listByMember(" "))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ====== unsubscribe() ======
    @Test
    @DisplayName("구독 해제 성공: 본인 소유 확인 후 삭제")
    void unsubscribe_success() {
        String subscriberMemberId = "userA";
        Long kId = 100L;
        MemberEntity subscriber = MemberEntity.builder().memberId(subscriberMemberId).build();

        KeywordSubscriptionEntity entity = KeywordSubscriptionEntity.builder()
                .kId(kId).subscriber(subscriber).keyword("강아지").scopeBoardType(null).build();

        when(repo.findByKid(kId)).thenReturn(Optional.of(entity));

        DeleteKeywordRes res = service.unsubscribe(subscriberMemberId, kId);

        assertThat(res.isDeleted()).isTrue();
        assertThat(res.getKId()).isEqualTo(kId);
        verify(repo).delete(entity);
    }

    @Test
    @DisplayName("구독 해제 실패: 소유자 다르면 404 성격의 EntityNotFoundException")
    void unsubscribe_owner_mismatch() {
        String subscriberMemberId = "userA";
        Long kId = 100L;
        MemberEntity other = MemberEntity.builder().memberId("userB").build();

        KeywordSubscriptionEntity entity = KeywordSubscriptionEntity.builder()
                .kId(kId).subscriber(other).keyword("강아지").scopeBoardType(null).build();

        when(repo.findByKid(kId)).thenReturn(Optional.of(entity));

        assertThatThrownBy(() -> service.unsubscribe(subscriberMemberId, kId))
                .isInstanceOf(EntityNotFoundException.class);
        verify(repo, never()).delete(any());
    }

    @Test
    @DisplayName("구독 해제 실패: 엔티티 없음 → EntityNotFoundException")
    void unsubscribe_not_found() {
        when(repo.findByKid(999L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.unsubscribe("userA", 999L))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Nested
    class UnsubscribeValidation {
        @Test
        @DisplayName("검증: subscriberMemberId null/blank → IllegalArgumentException")
        void subscriber_id_blank() {
            assertThatThrownBy(() -> service.unsubscribe(null, 1L))
                    .isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> service.unsubscribe(" ", 1L))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("검증: kId null → IllegalArgumentException")
        void kid_null() {
            assertThatThrownBy(() -> service.unsubscribe("userA", null))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    // ====== loadCandidatesFor() ======
    @Test
    @DisplayName("매칭 후보 로드: null 스코프 + 보드타입 스코프 합치기")
    void loadCandidatesFor_merge() {
        KeywordSubscriptionEntity g1 = KeywordSubscriptionEntity.builder()
                .kId(1L).keyword("강아지").scopeBoardType(null).build();
        KeywordSubscriptionEntity g2 = KeywordSubscriptionEntity.builder()
                .kId(2L).keyword("고양이").scopeBoardType(BoardType.FREE).build();

        when(repo.findByScopeBoardTypeIsNull()).thenReturn(List.of(g1));
        when(repo.findByScopeBoardType(BoardType.FREE)).thenReturn(List.of(g2));

        List<KeywordSubscriptionEntity> res = service.loadCandidatesFor(BoardType.FREE);

        assertThat(res).hasSize(2);
        assertThat(res).extracting("kId").containsExactlyInAnyOrder(1L, 2L);
    }

    @Test
    @DisplayName("매칭 후보 로드: boardType=null이면 전체(null 스코프)만")
    void loadCandidatesFor_null_scope_only() {
        KeywordSubscriptionEntity g1 = KeywordSubscriptionEntity.builder()
                .kId(1L).keyword("강아지").scopeBoardType(null).build();

        when(repo.findByScopeBoardTypeIsNull()).thenReturn(List.of(g1));

        List<KeywordSubscriptionEntity> res = service.loadCandidatesFor(null);

        assertThat(res).hasSize(1);
        assertThat(res.get(0).getScopeBoardType()).isNull();
    }
}