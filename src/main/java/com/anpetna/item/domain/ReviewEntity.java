package com.anpetna.item.domain;

import com.anpetna.image.domain.ImageEntity;
import com.anpetna.member.domain.MemberEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Check;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "anpetna_review")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Check(constraints = "review_rating BETWEEN 1 AND 5")  // 애플리케이션 레벨 제약
public class ReviewEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_id")
    private Long reviewId;

    @Column(name = "review_content", nullable = false, length = 500)
    private String content;

    @Column(name = "review_rating", nullable = false)
    private int rating;

    @Column(name = "review_regDate", nullable = false)
    private LocalDateTime regDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false, referencedColumnName = "item_id")
    private ItemEntity itemId;

    // member FK 추가
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false, referencedColumnName = "member_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private MemberEntity memberId;

    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "image")
    private ImageEntity image;

}