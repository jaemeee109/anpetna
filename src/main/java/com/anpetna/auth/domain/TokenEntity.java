package com.anpetna.auth.domain;

import com.anpetna.member.domain.MemberEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "anpetna_token",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_token_member", columnNames = "member_id")
        })//@UniqueConstraint("member_id")로 1:1 제약을 보장
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TokenEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "token_no")
    private Long tokenNo;

    @Column(name = "member_id", nullable = false)
    private String memberId;

    @Column(name = "token_refresh_token", nullable = false)
    private String refreshToken;

    @Column(name = "token_expiresAt")
    private Instant expiresAt;//만료시각 얘만 있으면 자동 만료밖에 못 함

    @Column(name = "token_revokedAt")
    private Instant revokedAt;// null이면 유효, 값이 있으면 무효화 시각

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false, referencedColumnName = "member_id", insertable = false, updatable = false)
    private MemberEntity member;
}