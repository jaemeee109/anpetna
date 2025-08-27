package com.anpetna.item.dto.modifyReview;

import com.anpetna.coreDto.ImageListDTO;
import com.anpetna.item.dto.ItemDTO;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ModifyReviewReq extends ImageListDTO {

    private Long reviewId;

    private String content;

    private int rating;

    private ItemDTO itemId;

}
