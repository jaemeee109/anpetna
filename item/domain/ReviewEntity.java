package com.anpetna.item.domain;

import com.anpetna.coreDomain.BaseEntity;
import com.anpetna.coreDomain.ImageEntity;
import com.anpetna.member.domain.MemberEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Check;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "anpetna_review")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Setter
@Getter
@Check(constraints = "review_rating BETWEEN 1 AND 5")  // 애플리케이션 레벨 제약 → 코드 차원 (컨트롤러, DTO, 서비스, 도메인 객체 등)에서 검증
@ToString
public class ReviewEntity extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_id")
    private Long reviewId;

    @Column(name = "review_content", nullable = false, length = 500)
    private String content;

    @Column(name = "review_rating", nullable = false)
    private int rating;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", referencedColumnName = "item_id")
    private ItemEntity item;

    // member FK 추가
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id",referencedColumnName = "member_id")
    private MemberEntity member;

    @Builder.Default
    @OneToMany(mappedBy = "review", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ImageEntity> images = new ArrayList<>();
    //  최대 5장

    //  타 사용자의 공감..
    //  옵션별 정렬
    public void addImage(ImageEntity image) {
        images.add(image);
        image.setReview(this);
    }
    public void removeImage(ImageEntity image) {
        images.remove(image);
        image.setReview(null);
    }

}