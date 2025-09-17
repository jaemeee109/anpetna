package com.anpetna.notification;

import com.anpetna.core.coreDto.PageRequestDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;
import com.anpetna.notification.common.constant.NotificationType;
import com.anpetna.notification.common.constant.TargetType;
import com.anpetna.notification.common.domain.NotificationEntity;
import com.anpetna.notification.common.dto.*;
import com.anpetna.notification.common.repository.NotificationRepository;
import com.anpetna.notification.common.service.NotificationServiceImpl;
import com.anpetna.notification.common.service.SseSessionRegistry;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class NotificationServiceTests {

    @Mock
    NotificationRepository repo;
    @Mock
    SseSessionRegistry sse;
    @Mock
    MemberRepository memberRepository;

    @InjectMocks
    NotificationServiceImpl service;

    // ---------- afterCommit 헬퍼 ----------
    @BeforeEach
    void initSync() {
        // TransactionSynchronizationManager의 쓰레드 로컬 초기화
        TransactionSynchronizationManager.initSynchronization();
    }

    @AfterEach
    void clearSync() {
        // 등록된 동기화/콜백 제거
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    private void runAfterCommitCallbacks() {
        for (TransactionSynchronization ts : TransactionSynchronizationManager.getSynchronizations()) {
            ts.afterCommit();
        }
        TransactionSynchronizationManager.clearSynchronization();
    }
    // -------------------------------------

    @Test
    void list_unreadOnly_true_이면_미읽음만_조회() {
        // given
        String me = "receiver-1";
        PageRequestDTO req = PageRequestDTO.builder().page(1).size(10).build();
        Pageable pageable = req.getPageable("createdAt");

        NotificationEntity n1 = dummyEntity(1L, false);
        Page<NotificationEntity> page = new PageImpl<>(List.of(n1), pageable, 1);

        when(repo.findByReceiver_MemberIdAndIsReadFalse(eq(me), any(Pageable.class)))
                .thenReturn(page);

        // when
        PageResponseDTO<NotificationDTO> res = service.list(me, req, true);

        // then
        assertThat(res.getDtoList()).hasSize(1);
        assertThat(res.getDtoList().get(0).isRead()).isFalse();
        verify(repo).findByReceiver_MemberIdAndIsReadFalse(eq(me), any(Pageable.class));
        verify(repo, never()).findByReceiver_MemberId(eq(me), any());
    }

    @Test
    void list_unreadOnly_null_이면_전체조회() {
        String me = "receiver-1";
        PageRequestDTO req = PageRequestDTO.builder().page(1).size(10).build();
        Pageable pageable = req.getPageable("createdAt");

        NotificationEntity n1 = dummyEntity(1L, false);
        NotificationEntity n2 = dummyEntity(2L, true);
        Page<NotificationEntity> page = new PageImpl<>(List.of(n1, n2), pageable, 2);

        when(repo.findByReceiver_MemberId(eq(me), any(Pageable.class))).thenReturn(page);

        PageResponseDTO<NotificationDTO> res = service.list(me, req, null);

        assertThat(res.getDtoList()).hasSize(2);
        verify(repo).findByReceiver_MemberId(eq(me), any(Pageable.class));
        verify(repo, never()).findByReceiver_MemberIdAndIsReadFalse(eq(me), any());
    }

    @Test
    void countUnread_정상() {
        when(repo.countByReceiver_MemberIdAndIsReadFalse("r1")).thenReturn(3L);

        UnreadCountRes res = service.countUnread("r1");

        assertThat(res.getCount()).isEqualTo(3L);
        verify(repo).countByReceiver_MemberIdAndIsReadFalse("r1");
    }

    @Test
    void markRead_미읽음이면_읽음으로_바꾸고_afterCommit에_broadcast() {
        // given
        String me = "user-1";
        Long nId = 100L;
        NotificationEntity n = dummyEntity(nId, false); // unread
        when(repo.findOneByIdAndOwner(nId, me)).thenReturn(Optional.of(n));

        // when
        MarkReadRes res = service.markRead(me, nId);

        // then: DB 업데이트 자체는 Mockito로 검증하긴 어렵지만,
        // 상태 전이가 반영됐음을 엔티티 필드로 확인
        assertThat(n.isRead()).isTrue();
        assertThat(n.getReadAt()).isNotNull();
        assertThat(res.isSuccess()).isTrue();

        // afterCommit 수동 실행 → sse.broadcast 호출 검증
        runAfterCommitCallbacks();
        verify(sse, times(1))
                .broadcast(eq(me), any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    void markRead_이미_읽은경우_broadcast_안보냄() {
        String me = "user-1";
        Long nId = 101L;
        NotificationEntity n = dummyEntity(nId, true); // already read
        when(repo.findOneByIdAndOwner(nId, me)).thenReturn(Optional.of(n));

        service.markRead(me, nId);
        runAfterCommitCallbacks();

        verify(sse, never()).broadcast(anyString(), any());
    }

    @Test
    void markRead_존재하지_않으면_예외() {
        when(repo.findOneByIdAndOwner(999L, "me")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.markRead("me", 999L))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void delete_하드삭제하고_afterCommit에_broadcast() {
        String me = "user-1";
        Long nId = 200L;
        NotificationEntity n = dummyEntity(nId, false);
        when(repo.findOneByIdAndOwner(nId, me)).thenReturn(Optional.of(n));

        DeleteNotificationRes res = service.delete(me, nId);

        assertThat(res.isSuccess()).isTrue();
        verify(repo).delete(n);

        runAfterCommitCallbacks();
        verify(sse, times(1))
                .broadcast(eq(me), any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    void connect_SseEmitter_등록() {
        SseEmitter emitter = new SseEmitter();
        when(sse.register(eq("me"), anyLong())).thenReturn(emitter);

        SseEmitter got = service.connect("me", null);

        assertThat(got).isNotNull();
        verify(sse).register(eq("me"), anyLong());
        // keepalive 전송 여부는 SseEmitter 내부라 직접 검증은 어렵지만
        // 예외 없이 반환되면 충분
    }

    @Test
    void createAndPush_성공시_save와_broadcast() {
        // given
        String receiverId = "r1";
        String actorId = "a1";
        var receiver = MemberEntity.builder().memberId(receiverId).build();
        var actor = MemberEntity.builder().memberId(actorId).build();

        when(memberRepository.findByMemberId(receiverId)).thenReturn(Optional.of(receiver));
        when(memberRepository.findByMemberId(actorId)).thenReturn(Optional.of(actor));

        NotificationEntity saved = NotificationEntity.builder()
                .nId(99L)
                .receiver(receiver)
                .actor(actor)
                .notificationType(NotificationType.COMMENT)
                .targetType(TargetType.COMMENT)
                .targetId("123")
                .nTitle("t")
                .nMessage("m")
                .linkUrl("/board/readOne/123")
                .build();
        // eventId/readAt 등은 굳이 세팅 안해도 무방
        when(repo.save(any(NotificationEntity.class))).thenReturn(saved);

        CreateNotificationCmd cmd = CreateNotificationCmd.builder()
                .receiverMemberId(receiverId)
                .actorMemberId(actorId)
                .notificationType(NotificationType.COMMENT)
                .targetType(TargetType.COMMENT)
                .targetId("123")
                .title("t").message("m")
                .linkUrl("/board/readOne/123")
                .build();

        // when
        NotificationDTO dto = service.createAndPush(cmd);

        // then
        assertThat(dto.getNId()).isEqualTo(99L);
        verify(repo).save(any(NotificationEntity.class));

        runAfterCommitCallbacks();
        verify(sse, times(1))
                .broadcast(eq(receiverId), any(SseEmitter.SseEventBuilder.class));
    }

    // ---------- 유틸: 더미 엔티티 ----------
    private NotificationEntity dummyEntity(Long id, boolean isRead) {
        return NotificationEntity.builder()
                .nId(id)
                .receiver(MemberEntity.builder().memberId("receiver-1").build())
                .actor(MemberEntity.builder().memberId("actor-1").build())
                .notificationType(NotificationType.COMMENT)
                .targetType(TargetType.COMMENT)
                .targetId("123")
                .nTitle("title")
                .nMessage("msg")
                .linkUrl("/board/readOne/123")
                .isRead(isRead)
                .readAt(isRead ? LocalDateTime.now() : null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

}
