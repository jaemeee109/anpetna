package com.anpetna.item.dto.modifyReview;

import com.anpetna.item.dto.ImageListDTO;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ModifyReviewReq extends ImageListDTO {

    private Long reviewId;

    private String content;

    @Min(1)
    @Max(5)
    private int rating;

}
