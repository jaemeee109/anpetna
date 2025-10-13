package com.anpetna.notification.feature.keyword.domain;

import com.anpetna.board.constant.BoardType;
import com.anpetna.core.coreDomain.BaseEntity;
import com.anpetna.member.domain.MemberEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(
        name = "anpetna_keyword_subscription",
        uniqueConstraints = {
                // 같은 회원이 같은 보드타입+키워드 중복 구독 불가
                @UniqueConstraint(
                        name = "uk_member_keyword_scope",
                        columnNames = {"subscriber_id", "keyword", "scope_board_type"}
                )
        },
        indexes = {
                @Index(name = "idx_subscriber_enabled", columnList = "subscriber_id"),
                @Index(name = "idx_scope_board_type", columnList = "scope_board_type")
        }
)
public class KeywordSubscriptionEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "k_id")
    private Long kId;

    /** 구독자 (회원) */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subscriber_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private MemberEntity subscriber;

    /** 사용자가 입력한 키워드 (그대로 비교) */
    @Column(name = "keyword", nullable = false, length = 100)
    private String keyword;

    /** 특정 보드타입에서만 매칭하고 싶으면 설정, 아니면 null */
    @Enumerated(EnumType.STRING)
    @Column(name = "scope_board_type", length = 30)
    private BoardType scopeBoardType;
}
