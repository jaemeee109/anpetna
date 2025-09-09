package com.anpetna.item.dto.registerReview;

import com.anpetna.image.dto.ImageDTO;
import lombok.Builder;
import lombok.Getter;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@ToString
@Getter
@Builder
public class RegisterReviewReq{

    private String content;

    private int rating;

    private LocalDateTime regDate;

    private Long itemId;

    private final List<ImageDTO> images = new ArrayList<>();

    public void addImage(ImageDTO imageDTO) {
        this.images.add(imageDTO);
    }

}
