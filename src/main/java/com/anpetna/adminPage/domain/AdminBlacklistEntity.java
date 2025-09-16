package com.anpetna.adminPage.domain;

import com.anpetna.core.coreDomain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "anpetna_admin_blacklist",
        indexes = {
                @Index(name = "idx_admin_blacklist_member", columnList = "member_id"),
                @Index(name = "idx_admin_blacklist_until", columnList = "until_at")
        })
@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AdminBlacklistEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id; // 블랙리스트 번호(pk)

    @Column(name = "member_id", nullable = false)
    private String memberId; // 블랙리스트 해당하는 멤버 id

    @Column(name = "blacklist_reason", length = 500, nullable = false)
    private String blacklistReason; // 블랙리스트 사유

    @Column(name = "admin_id", nullable = false)
    private String adminId; // 블랙리스트 조작한 관리자 id

    @Column(name = "until_at")
    private LocalDateTime untilAt; // null = 무기한

    /*블랙리스트 수동 해제 가능하게 하고싶으면 하단 메서드 주석 지우기*/
    /*@Column(name = "revoked_at")
    private LocalDateTime revokedAt; // 수동 해제 시각 (옵션)

    public boolean isActiveAt(LocalDateTime now) {
        if (revokedAt != null) return false;
        return untilAt == null || untilAt.isAfter(now);
    }*/
}

/**
 * 계정 블랙리스트 이력 테이블
 * - member_id 기준으로 여러 번(3d/5d/7d/무기한) 기록될 수 있음 (1:N)
 * - untilAt == null 이면 "무기한" 의미
 * - (선택) 수동 해제 사용 시 revokedAt 열 추가 가능
 */
