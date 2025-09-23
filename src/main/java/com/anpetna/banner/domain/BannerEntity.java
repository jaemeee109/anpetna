package com.anpetna.banner.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "anpetna_banner")
@Getter
@Setter
@ToString
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BannerEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // 배너 번호

    @Column(nullable = false)
    private String imageUrl; // 배너 이미지 경로 (예: "/files/banner/fall.jpg")

    private String linkUrl; // 클릭 시 이동할 링크 (예: "/promo/fall-sale")

    @Column(nullable = false)
    private boolean active; // 노출 여부 (관리자가 끄면 내려감)

    private LocalDateTime startAt; // 배너 시작(null 허용하면 상시 노출)
    private LocalDateTime endAt; // 배너 종료  (null 허용하면 상시 노출)

    @Column(nullable = false)
    private Integer sortOrder; // 정렬 우선순위 (낮을수록 앞에 배치)
}
