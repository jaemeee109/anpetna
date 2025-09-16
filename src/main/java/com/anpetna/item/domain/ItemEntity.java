package com.anpetna.item.domain;

import com.anpetna.image.domain.ImageEntity;
import com.anpetna.core.coreDomain.BaseEntity;
import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.constant.ItemSellStatus;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name="anpetna_item")
@Setter
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class ItemEntity extends BaseEntity {

    @Id
    @Column(name="item_id")
    @GeneratedValue(strategy= GenerationType.IDENTITY)
    private Long itemId; // 상품코드

    @Column(name="item_name", nullable=false,length=50)
    private String itemName; // 상품명

    @Column(name="item_price", nullable=false)
    private int itemPrice; // 가격

    @Column(name="item_stock", nullable=false)
    private int itemStock; // 재고수량

    @Lob    // 데이터베이스에서 큰 크기의 데이터(텍스트나 바이너리)를 저장할 때 사용
    @Column(name="item_detail", nullable=false, length = 2000)
    private String itemDetail; // 상품 상세설명

    @Column(name="item_Category")
    @Enumerated(EnumType.STRING)  // DB에 enum의 이름(문자열)으로 저장 (숫자로 저장하는 ORDINAL보다 안전).
    private ItemCategory itemCategory; // 상품 카테고리

    @Column(name="item_sellStatus")
    @Enumerated(EnumType.STRING)
    private ItemSellStatus itemSellStatus; // 상품 판매상태 (1은 판매중, 0은 품절)

    @Column(name="item_saleStatus")
    private int itemSaleStatus; // 상품 세일상태

    @Builder.Default
    @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<ImageEntity> images = new ArrayList<>();

    //JPA의 컬렉션 매핑(@OneToMany)
    //List<ImageEntity>는 DB에서 정렬 조건이 없으면 임의 순서로 가져올 수 있음
    //기본적으로 @OneToMany는 @OrderColumn 없으면 순서 보장 안 됨

    //images 컬렉션 관리용 메서드
    public void addImage(ImageEntity image) {
        images.add(image);
        image.setItem(this);
    }
    public void removeImage(ImageEntity image) {
        images.remove(image);
        image.setItem(null);
    }
    public void setImage(ImageEntity image, int sortOrder) {
        images.add(sortOrder,image);
        image.setItem(this);
    }
    //삭제: images.remove(image) → flush 시점에 delete.
    //추가: images.add(newImage) → flush 시점에 insert.
    //순서 변경: Collections.sort(images, comparator) → flush 시점에 sortOrder 컬럼 update.
}
