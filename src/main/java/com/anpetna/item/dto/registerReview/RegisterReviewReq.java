package com.anpetna.item.dto.registerReview;

import com.anpetna.coreDto.ImageDTO;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class RegisterReviewReq {

    private String content;

    private int rating;

    private LocalDateTime regDate;

    private String itemId;

    private List<ImageDTO> images = new ArrayList<>();

}
