package com.anpetna.item.domain;


import com.anpetna.coreDomain.BaseEntity;
import com.anpetna.coreDomain.ImageEntity;
import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.constant.ItemSaleStatus;
import com.anpetna.item.constant.ItemSellStatus;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name="anpetna_item")
@Getter
@Builder
@Setter
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class ItemEntity extends BaseEntity {

    @Id
    @Column(name="item_id")
    @GeneratedValue(strategy= GenerationType.AUTO)
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

    @Column(name="item_sellStatus", nullable=false)
    @Enumerated(EnumType.STRING)    // DB에 enum의 이름(문자열)으로 저장 (숫자로 저장하는 ORDINAL보다 안전).
    private ItemSellStatus itemSellStatus; // 상품 판매상태

    @Column(name="item_saleStatus")
    @Enumerated(EnumType.STRING)    // DB에 enum의 이름(문자열)으로 저장 (숫자로 저장하는 ORDINAL보다 안전).
    private ItemSaleStatus itemSaleStatus; // 상품 세일상태

    @Column(name="item_Category", nullable=false)
    @Enumerated(EnumType.STRING)  // DB에 enum의 이름(문자열)으로 저장 (숫자로 저장하는 ORDINAL보다 안전).
    private ItemCategory itemCategory; // 상품 카테고리

    @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ImageEntity> images;

    //  0번 : 썸네일
    //  1~3번 : 상품이미지 (1번은 대표 이미지)
    //  4번~ : 상품 상세 설명

    public void addImage(ImageEntity image) {
        images.add(image);
        image.setItem(this);
    }
    public void removeImage(ImageEntity image) {
        images.remove(image);
        image.setItem(null);
    }

}
