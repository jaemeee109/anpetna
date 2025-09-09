package com.anpetna.auth.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "anpetna_blacklist")
@Getter
@Setter
@NoArgsConstructor
public class BlackListedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long blackNo;

    @Column(name = "access_token", nullable = false)
    private String accessTokenHash; // 해싱된 access토큰

//    @Column(name = "refresh_token")
//    private String refreshTokenHash; // 해싱된 refresh토큰

    @Column(name = "access_expiresAt",nullable = false)
    private Instant expiresAt;      // 만료시간

}
