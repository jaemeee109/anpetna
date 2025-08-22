package com.anpetna.coreDomain;

import com.anpetna.board.domain.BoardEntity;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.domain.ReviewEntity;
import com.anpetna.member.domain.MemberEntity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "anpetna_image")
@Getter
@Setter
@NoArgsConstructor
public class ImageEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "image_uuid")
    private Long  uuid;

    @Column(name = "image_fileName", nullable = false)
    private String fileName;

    @Column(name = "image_url", nullable = false, length = 500)
    private String url;

    @Column(name = "image_ord", nullable = false)
    private Integer sortOrder = 0;

    // 부모들 (nullable)
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "bno", foreignKey = @ForeignKey(name = "fk_image_board"))
    private BoardEntity board;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "member", foreignKey = @ForeignKey(name = "fk_image_member"))
    private MemberEntity member;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "item_id", foreignKey = @ForeignKey(name = "fk_image_item"))
    private ItemEntity item;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "review",foreignKey = @ForeignKey(name = "fk_image_review"))
    private ReviewEntity review;


    // ====== 편의 메서드: 부모 연결은 한 번에 하나만 ======
    public void attachToBoard(BoardEntity b) {
        this.board = b;
        this.member = null;
        this.item = null;
        this.review= null;
        if (b != null) b.getImages().add(this);
    }
    public void attachToMember(MemberEntity m) {
        this.board = null;
        this.member = m;
        this.item = null;
        this.review= null;
        if (m != null) m.getImages().add(this);
    }
    public void attachToItem(ItemEntity i) {
        this.board = null;
        this.member = null;
        this.item = i;
        this.review = null;
        if (i != null) i.getImages().add(this);
    }
    public void attachToReview(ReviewEntity i) {
        this.board = null;
        this.member = null;
        this.item = null;
        this.review = i;
        if (i != null) i.getImages().add(this);
    }

    // ====== JPA 생명주기에서 유효성 체크 (서비스 실수 방지) ======
/*    @PrePersist
    @PreUpdate
    public void validateExactlyOneParent() {
        int cnt = 0;
        if (board  != null) cnt++;
        if (member != null) cnt++;
        if (item   != null) cnt++;
        if (review != null) cnt++;
        if (cnt != 1) {
            throw new IllegalStateException("Image must be attached to exactly ONE parent (board|member|item|review).");
        }
    }*/

    // 정적 팩토리
    public static ImageEntity forBoard(String fileName, String url, BoardEntity b, Integer order) {
        ImageEntity img = new ImageEntity();
        img.setFileName(fileName);
        img.setUrl(url);
        img.setSortOrder(order == null ? 0 : order);
        img.attachToBoard(b);
        return img;
    }
    public static ImageEntity forMember(String fileName, String url, MemberEntity m, Integer order) {
        ImageEntity img = new ImageEntity();
        img.setFileName(fileName);
        img.setUrl(url);
        img.setSortOrder(order == null ? 0 : order);
        img.attachToMember(m);
        return img;
    }
    public static ImageEntity forItem(String fileName, String url, ItemEntity i, Integer order) {
        ImageEntity img = new ImageEntity();
        img.setFileName(fileName);
        img.setUrl(url);
        img.setSortOrder(order == null ? 0 : order);
/*        img.attachToItem(i);*/
        return img;
    }
    public static ImageEntity forReview(String fileName, String url, ReviewEntity r, Integer order) {
        ImageEntity img = new ImageEntity();
        img.setFileName(fileName);
        img.setUrl(url);
        img.setSortOrder(order == null ? 0 : order);
        img.attachToReview(r);
        return img;
    }
}