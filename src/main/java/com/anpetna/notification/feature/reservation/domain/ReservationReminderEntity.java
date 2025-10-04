package com.anpetna.notification.feature.reservation.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "anpetna_reservation_reminder")

public class ReservationReminderEntity {

    public enum Status {PENDING, CANCELLED, SENT, FAILED}
    public enum Kind {REMIND_24H, REMIND_3H}

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "r_id")
    private Long rId;

    @Column(name = "reservation_id", nullable = false, length = 100)
    private String reservationId;

    @Column(name = "member_id", nullable = false, length = 100)
    private String memberId;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 20)
    private Kind kind;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(name = "fire_at", nullable = false)
    private LocalDateTime fireAt;

    @Column(name = "dedupe_key", nullable = false, length = 150, unique = true)
    private String dedupeKey;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "service_kind", length = 20)
    private String serviceKind;

    @Column(name = "title_override", length = 150)
    private String titleOverride;

    @PrePersist void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
