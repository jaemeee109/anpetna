package com.anpetna.item.dto.modifyReview;

import com.anpetna.image.dto.ImageDTO;
import com.anpetna.item.dto.ItemDTO;
import lombok.Builder;
import lombok.Getter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Builder
public class ModifyReviewReq {

    private Long reviewId;

    private String content;

    private int rating;

    private ItemDTO itemId;


}
