package com.anpetna.board.domain;

import com.anpetna.board.constant.BoardType;
import com.anpetna.coreDomain.BaseEntity;
import com.anpetna.coreDomain.ImageEntity;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.util.ArrayList;
import java.util.List;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
        name = "anpetna_board"
        // ★ 선택: 성능 위해 보드타입+카테고리 인덱스 추가
        , indexes = {
        @Index(name = "idx_board_type_category", columnList = "board_type, faq_category")
}
)
@Getter
@Setter
@Builder
@AllArgsConstructor // 모든 필드값으로 생성자 만듬
@NoArgsConstructor // 기본생성자
@ToString(exclude = "images") // 연관 필드 제외(순환참조/LAZY 초기화 이슈 방지)
public class BoardEntity extends BaseEntity {

    @Column(name = "bWriter", nullable = false)
    private String bWriter;       // 게시물 작성자 -> member 쪽 회원 id fk

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bno", nullable = false)
    private Long bno;            // 게시물 번호

    @Column(name = "bTitle", nullable = false)
    private String bTitle;       // 게시물 제목

    @Lob
    @Column(name = "bContent", nullable = false, length = 2000)
    private String bContent;        // 게시물 내용

    @Column(name = "bViewCount", nullable = false)
    @Builder.Default
    private Integer bViewCount = 0;        // 게시물 조회수

    @Column(name = "bLikeCount", nullable = false)
    @Builder.Default
    private Integer bLikeCount = 0;        // 게시물 좋아요 수

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private BoardType boardType;    // 게시물 종류

    @Column(nullable = false) @Builder.Default
    private Boolean noticeFlag = false;        // 상단 고정 여부

    @Column(nullable = false)
    private Boolean isSecret;        // 비밀글 여부

    @Column(name = "faq_category", length = 50)
    private String faqCategory; // ★ 추가

    @Builder.Default
    @OneToMany(mappedBy = "board", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, uuid ASC") // 08.27 추가
    private List<ImageEntity> images = new ArrayList<>(); // 이미지


    public void addImage(ImageEntity image) {
        images.add(image);
        image.setBoard(this); // ImageEntity에 setBoard(…) 존재해야 함
    }

    public void removeImage(ImageEntity image) {
        images.remove(image);
        image.setBoard(null);
    }

}