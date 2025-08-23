package com.anpetna.item.dto.modifyReview;

import com.anpetna.coreDto.ImageListDTO;
import com.anpetna.item.dto.ItemDTO;
import lombok.Getter;

@Getter
public class ModifyReviewReq extends ImageListDTO {

    private Long reviewId;

    private String content;

    private ItemDTO itemId;

}
