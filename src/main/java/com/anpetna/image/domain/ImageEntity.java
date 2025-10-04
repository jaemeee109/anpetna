package com.anpetna.image.domain;

import com.anpetna.board.domain.BoardEntity;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.domain.ReviewEntity;
import com.anpetna.member.domain.MemberEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Entity
@Table(name = "anpetna_image")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ImageEntity {

    @Id
    @JdbcTypeCode(SqlTypes.CHAR)                        // CHAR(36)로 저장
    @Column(name = "image_uuid", length = 36, nullable = false, updatable = false)
    private UUID uuid;
    //이미지 등록시 uuid서비스에서 생성...GeneratedValue에 IDENTITY/AUTO에 코드를 맞추면 DB에 들어가고 나서야 UUID를 활용할 수 있음

    //@GeneratedValue
    //Hibernate가 UUID를 자동 생성하도록 설정.
    //기본 전략은 JPA AUTO → Hibernate가 UUIDGenerator 사용 가능.

    @Column(name = "image_ext")
    private String ext;

    @Column(name = "image_originalName", nullable = false)
    private String originalName;

    @Column(name = "image_fileName")
    private String fileName = "a";

    @Column(name = "image_url")
    private String url;

    @Column(name = "image_contentType")
    private String contentType;

    @Column(name = "image_ord")
    private Integer sortOrder = 0;

    // 부모들 (nullable)
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "bno", foreignKey = @ForeignKey(name = "fk_image_board"))
    private BoardEntity board;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "member_id", foreignKey = @ForeignKey(name = "fk_image_member"))
    @OnDelete(action = OnDeleteAction.CASCADE)
    private MemberEntity member;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "item_id", foreignKey = @ForeignKey(name = "fk_image_item"))
    private ItemEntity item;



    // ====== 편의 메서드: 부모 연결은 한 번에 하나만 ======
    public void attachToBoard(BoardEntity b) {
        this.board = b;
        this.member = null;
        this.item = null;
        if (b != null) b.getImages().add(this);
    }
    public void attachToMember(MemberEntity m) {
        this.board = null;
        this.member = m;
        this.item = null;
        if (m != null) m.getImages().add(this);
    }
    public void attachToItem(ItemEntity i) {
        this.board = null;
        this.member = null;
        this.item = i;
        if (i != null) i.getImages().add(this);
    }

    // ====== JPA 생명주기에서 유효성 체크 (서비스 실수 방지) ======
    @PrePersist
    @PreUpdate
    public void validateExactlyOneParent() {
        int cnt = 0;
        if (board  != null) cnt++;
        if (member != null) cnt++;
        if (item   != null) cnt++;

        // 리뷰 전용 이미지(ReviewEntity가 image FK로 참조)인 경우에는
        // board/member/item 부모가 없어도 정상으로 본다.
        if (cnt == 0) {
            return;
        }


        if (cnt != 1) {
            throw new IllegalStateException("Image must be attached to exactly ONE parent (board|member|item|review).");
        }
    }

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
        img.attachToItem(i);
        return img;
    }
}