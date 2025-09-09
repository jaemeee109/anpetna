package com.anpetna.image.dto;


import lombok.*;

import java.util.ArrayList;
import java.util.List;

@ToString
@Getter
@Setter
public class ImageListDTO {

    private final List<ImageDTO> images = new ArrayList<>();

    public void addImage(ImageDTO imageDTO) {
        this.images.add(imageDTO);
    }
}
