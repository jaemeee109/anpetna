package com.anpetna.coreDto;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.util.ArrayList;
import java.util.List;

@ToString
@Getter
@Setter
public class ImageListDTO {

    public List<ImageDTO> images = new ArrayList<>();

    public void addImage(ImageDTO imageDTO) {
        images.add(imageDTO);
    }
}
