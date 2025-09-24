package com.anpetna.item.dto.modifyItem;

import com.anpetna.image.dto.ExistingImageDTO;
import com.anpetna.image.dto.NewImageDTO;
import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.constant.ItemSellStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.ToString;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@Builder(toBuilder = true)
@Getter
@ToString
public class ModifyItemReq {

    private Long itemId;

    private String itemName; // 상품명

    private Integer itemPrice; // 가격

    private Integer itemStock; // 재고수량

    private String itemDetail; // 상품 상세설명

    private ItemSellStatus itemSellStatus; // 상품 판매상태

    private ItemCategory itemCategory; // 상품 카테고리

    @NotNull
    private String existingThumb;
    private MultipartFile newThumb;

    @Builder.Default
    private List<ExistingImageDTO> existingImages = new ArrayList<>();
    @Builder.Default
    private List<NewImageDTO> newImages= new ArrayList<>();

}
