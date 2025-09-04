package com.anpetna.image.service;

import com.anpetna.image.dto.ImageDTO;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public interface ImageService {

    public ImageDTO uploadImage(MultipartFile files) throws IOException;
}
