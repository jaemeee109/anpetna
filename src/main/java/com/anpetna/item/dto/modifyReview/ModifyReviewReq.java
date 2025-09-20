package com.anpetna.item.dto.modifyReview;

import com.anpetna.image.dto.ImageDTO;
import com.anpetna.item.dto.ItemDTO;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ModifyReviewReq {

    private Long reviewId;

    private String content;

    private int rating;

    private Long itemId;

    Boolean removeImage;


}
