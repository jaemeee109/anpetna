package com.anpetna.item.domain;

import com.anpetna.coreDomain.ImageEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Check;

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
@ToString(exclude = "images")
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

    @ManyToOne
    @JoinColumn(name = "item_id", nullable = false)
    private ItemEntity itemId;

    @Builder.Default
    @OneToMany(mappedBy = "review", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ImageEntity> images = new ArrayList<>();

    public void addImage(ImageEntity image) {
        images.add(image);
        image.setReview(this);
    }
    public void removeImage(ImageEntity image) {
        images.remove(image);
        image.setReview(null);
    }
}