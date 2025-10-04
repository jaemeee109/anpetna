package com.anpetna.notification.common.service;

import com.anpetna.core.coreDto.PageRequestDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;
import com.anpetna.notification.common.constant.NotificationType;
import com.anpetna.notification.common.constant.TargetType;
import com.anpetna.notification.common.domain.NotificationEntity;
import com.anpetna.notification.common.dto.*;
import com.anpetna.notification.common.repository.NotificationRepository;
import com.anpetna.notification.common.constant.NotificationVariant;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    // SSE 연결 타임아웃(밀리초) – 1시간. 서버가 이 시간까지 연결을 유지하려 시도.
    private final long SSE_TIMEOUT_MS = 60L * 60 * 1000;

    // 의존성 주입: 알림 저장/조회용 리포지토리
    private final NotificationRepository repo;

    // 의존성 주입: SSE 세션(Emitter) 관리 레지스트리 (사용자별 emitter 등록/제거/브로드캐스트)
    private final SseSessionRegistry sse;

    // 의존성 주입: 멤버 조회(수신자·행위자)용 리포지토리
    private final MemberRepository memberRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<NotificationDTO> list(String receiverMemberId, PageRequestDTO pageRequestDTO, Boolean unreadOnly) {
        // 프런트에서 온 PageRequestDTO로 Pageable 생성(정렬 기준: createdAt)
        var pageable = pageRequestDTO.getPageable("createdAt");

        // unreadOnly==true면 미읽음만, 아니면 전체 조회. (JPA 메서드 쿼리 사용)
        Page<NotificationEntity> page = Boolean.TRUE.equals(unreadOnly)
                ? repo.findByReceiver_MemberIdAndIsReadFalse(receiverMemberId, pageable)
                : repo.findByReceiver_MemberId(receiverMemberId, pageable);

        // 엔티티 페이지 → DTO 페이지로 변환 (PageResponseDTO.toDTO가 map & 메타 데이터 조립)
        return PageResponseDTO.toDTO(page, NotificationDTO::from, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public UnreadCountRes countUnread(String receiverMemberId) {
        // 미읽음 카운트만 빠르게 조회 (뱃지 숫자용)
        return new UnreadCountRes(repo.countByReceiver_MemberIdAndIsReadFalse(receiverMemberId));
    }

    @Override
    @Transactional // 쓰기 작업이므로 readOnly=false로 오버라이드
    public MarkReadRes markRead(String receiverMemberId, Long nId) {
        // 1) 사용자의 알림만 읽음 처리할 수 있도록 소유자 검증 포함 조회
        NotificationEntity entity = repo.findOneByIdAndOwner(nId, receiverMemberId)
                .orElseThrow(() -> new EntityNotFoundException("notification"));

        boolean changed = false;

        // 2) 이미 읽은 건이면 중복 업데이트 방지
        if (!entity.isRead()) {
            entity.setRead(true);
            entity.setReadAt(LocalDateTime.now());
            changed = true;
        }

        // 3) 트랜잭션 커밋 후(SUCCESS 시점) SSE로 '읽음 이벤트' 브로드캐스트
        //    - DB 커밋이 실패하면 푸시도 나가면 안 됨 → afterCommit로 보장
        if (changed) {
            afterCommit(() ->
                    sse.broadcast(
                            receiverMemberId,
                            SseEmitter.event()
                                    .name("notification.read")                 // 이벤트 이름(클라이언트에서 이 이름으로 핸들)
                                    .data(Map.of("id", nId))                   // 최소 정보: 어떤 알림이 읽혔는지
                    )
            );
        }

        // 4) 응답 DTO (성공 여부 포함)
        return new MarkReadRes(nId, true);
    }

    @Override
    @Transactional // 쓰기 작업
    public DeleteNotificationRes delete(String receiverMemberId, Long nId) {
        // 1) 소유자 검증 포함 조회
        NotificationEntity entity = repo.findOneByIdAndOwner(nId, receiverMemberId)
                .orElseThrow(() -> new EntityNotFoundException("notification"));

        // 2) 삭제
        repo.delete(entity);

        // 3) 커밋 후 삭제 이벤트 푸시(목록에서 제거 반영)
        afterCommit(() -> sse.broadcast(
                receiverMemberId,
                SseEmitter.event()
                        .name("notification.deleted")
                        .data(Map.of("id", nId))
        ));

        return new DeleteNotificationRes(nId, true);
    }

    public SseEmitter connect(String receiverMemberId, String lastEventId) {
        // 1) 사용자별 SSE Emitter 등록(타임아웃 지정)
        SseEmitter emitter = sse.register(receiverMemberId, 60L * 60 * 1000);

        try {
            // 2) 재연결 간격 힌트(클라이언트 EventSource의 재시도 간격)
            emitter.send(SseEmitter.event().reconnectTime(3000));

            // 3) 최초 핑 전송 – 일부 클라이언트/프록시는 첫 이벤트가 와야 연결 유지/보여짐
            emitter.send(SseEmitter.event().name("keepalive").data("ok"));

            // [개선 여지] lastEventId를 활용해 끊긴 동안의 미수신 알림을 재전송할 수 있음.
            //  - 서버가 이벤트에 고유 eventId(여기선 saved.getEventId())를 부여하고
            //  - repo에서 lastEventId 이후의 이벤트를 찾아 bulk로 send 하는 방식.
            //  - 현재 코드는 lastEventId를 받지만 사용은 안 하고 있음.
        } catch (Exception e) {
            // 전송 중 에러 시 emitter를 닫고 레지스트리에서 제거
            try { emitter.completeWithError(e); } catch (Exception ignored) {}
            sse.remove(receiverMemberId, emitter);
        }
        return emitter;
    }

    // 트랜잭션 커밋 이후(afterCommit)에 콜백을 실행하는 헬퍼
    // - DB 상태가 확정되기 전에 외부 전송(SSE/Webhook 등)을 해버리면, 롤백 시 정합성 깨짐 → 반드시 afterCommit 사용
    private void afterCommit(Runnable r) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { r.run(); }
        });
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW) // 쓰기 작업
    public NotificationDTO createAndPush(CreateNotificationCmd cmd) {

        // 1) 수신자/행위자 엔티티 조회
        //    - 알림 수신자는 필수. 행위자는 선택(null 허용)
        MemberEntity receiver = memberRepository.findByMemberId(cmd.getReceiverMemberId())
                .orElseThrow(() -> new EntityNotFoundException("receiver not found: " + cmd.getReceiverMemberId()));

        MemberEntity actor = null;
        if (cmd.getActorMemberId() != null) {
            actor = memberRepository.findByMemberId(cmd.getActorMemberId())
                    .orElse(null); // 행위자가 삭제/없음 등일 경우 null 허용(알림은 보낼 수 있게)
        }

        NotificationVariant variant = cmd.getVariant() == null
                ? NotificationVariant.DEFAULT
                : cmd.getVariant();

        // 2) Notification 엔티티 구성 및 저장
        //    - type/targetType/targetId는 알림의 분류와 클릭 시 이동할 대상 식별에 필요
        //    - nTitle/nMessage는 목록·토스트 등에 표시할 요약
        //    - linkUrl은 클릭 시 이동 링크(프런트 라우팅)
        NotificationEntity entity = NotificationEntity.builder()
                .receiver(receiver)
                .actor(actor)
                .notificationType(cmd.getNotificationType()) // 예: COMMENT, LIKE, KEYWORD 등
                .targetType(cmd.getTargetType())             // 예: BOARD, COMMENT, ITEM 등
                .targetId(cmd.getTargetId())                 // 타겟 식별자
                .nTitle(cmd.getTitle())
                .nMessage(cmd.getMessage())
                .linkUrl(cmd.getLinkUrl())
                .variant(variant)
                .isRead(false)                               // 신규 알림은 기본 미읽음
                .build();

        NotificationEntity saved = repo.save(entity);

        // 3) 응답용 DTO 변환
        NotificationDTO dto = NotificationDTO.from(saved);

        repo.flush();
        // 4) 커밋 이후 실시간 푸시(핵심!)
        //    - 이벤트 이름: "notification"
        //    - id: saved.getEventId() → SSE Last-Event-ID 복구용으로 쓰일 수 있음
        afterCommit(() -> sse.broadcast(
                cmd.getReceiverMemberId(),
                SseEmitter.event()
                        .name("notification")
                        .id(saved.getEventId()) // 고유 이벤트 ID (Emitter가 지원, 클라가 Last-Event-ID로 전달 가능)
                        .data(dto)
        ));

        return dto;
    }

    @Override
    @Transactional
    public void notify(String receiverMemberId, NotificationType type, TargetType targetType, String targetId) {

        MemberEntity receiver = memberRepository.findByMemberId(receiverMemberId)
                .orElseThrow(() -> new EntityNotFoundException("receiver not found: " + receiverMemberId));

        NotificationEntity entity = NotificationEntity.builder()
                .receiver(receiver)
                .notificationType(type)
                .targetType(targetType)
                .targetId(targetId)
                .isRead(false)
                .build();

        NotificationEntity saved = repo.save(entity);
        NotificationDTO dto = NotificationDTO.from(saved);
        repo.flush();

        afterCommit(() -> sse.broadcast(
                receiverMemberId,
                SseEmitter.event()
                        .name("notification")
                        .id(saved.getEventId())
                        .data(dto)
        ));
    }

}