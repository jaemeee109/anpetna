package com.anpetna.notification.common.domain;

import com.anpetna.member.domain.MemberEntity;
import com.anpetna.notification.common.constant.NotificationType;
import com.anpetna.notification.common.constant.TargetType;
import com.anpetna.notification.common.constant.NotificationVariant;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "anpetna_notification",
        indexes = {
                @Index(name = "idx_noti_receiver_created", columnList = "receiver_id, created_at DESC"),
                @Index(name = "idx_noti_receiver_isread_created", columnList = "receiver_id, is_read, created_at DESC"),
                @Index(name = "idx_noti_type", columnList = "notification_type"),
                @Index(name = "idx_noti_target", columnList = "target_type, target_id")})
public class NotificationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "n_id")
    private Long nId;

    /** 알림 받는 사람 */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "receiver_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private MemberEntity receiver;

    /** 알림 유발자(없을 수 있음) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private MemberEntity actor;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_type", nullable = false, length = 40)
    private NotificationType notificationType;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", length = 40)
    private TargetType targetType;

    @Column(name = "target_id", length = 64)
    private String targetId;

    /** SSE 재전송용 이벤트 ID */
    @Column(name = "event_id", nullable = false, updatable = false, length = 36)
    private String eventId;

    @Column(name = "n_title", length = 360)
    private String nTitle;

    @Lob
    @Column(name = "n_message")
    private String nMessage;

    /** 내부 라우팅 경로만 저장 권장 */
    @Column(name = "link_url", length = 500)
    private String linkUrl;

    /** 읽음 상태/시각 */
    @Column(name = "is_read", nullable = false)
    private boolean isRead;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    /** 감사 필드 */
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        if (this.eventId == null) this.eventId = UUID.randomUUID().toString();
        if (this.createdAt == null) this.createdAt = LocalDateTime.now();
        if (this.updatedAt == null) this.updatedAt = this.createdAt;
        // isRead 기본 false, readAt null
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "variant")
    private NotificationVariant variant;
}
