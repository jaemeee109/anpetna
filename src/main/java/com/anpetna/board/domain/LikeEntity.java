package com.anpetna.board.domain;

import com.anpetna.board.constant.LikeTargetType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Table(name = "anpetna_like",
        uniqueConstraints = @UniqueConstraint(name = "uq_like", columnNames = {"target_type", "target_id", "member_id"}))
public class LikeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    private LikeTargetType targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Column(name = "member_id", nullable = false, length = 64)
    private String memberId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    private LikeEntity(LikeTargetType targetType, Long targetId, String memberId) {
        this.targetType = targetType;
        this.targetId = targetId;
        this.memberId = memberId;
        this.createdAt = LocalDateTime.now();
    }
}
