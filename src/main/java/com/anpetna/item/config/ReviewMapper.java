package com.anpetna.item.config;

import com.anpetna.core.coreDomain.ImageEntity;
import com.anpetna.core.coreDto.ImageDTO;
import com.anpetna.core.coreDto.ImageListDTO;
import com.anpetna.item.domain.ReviewEntity;
import com.anpetna.item.dto.ReviewDTO;
import com.anpetna.item.dto.modifyReview.ModifyReviewReq;
import com.anpetna.item.dto.registerReview.RegisterReviewReq;
import com.anpetna.item.dto.searchOneReview.SearchOneReviewRes;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.modelmapper.TypeMap;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ReviewMapper {


   private final ModelMapper modelMapper;
    //  필드를 final로 꼭 해야하는가

   public TypeMap<RegisterReviewReq, ReviewEntity> cReviewMapReq() {
       TypeMap<RegisterReviewReq, ReviewEntity> typeMap = modelMapper.createTypeMap(RegisterReviewReq.class, ReviewEntity.class);
       typeMap.addMappings(mapper -> mapper.skip(ReviewEntity::setItemId));
       return imageToEntity(typeMap);
   }

    public TypeMap<ModifyReviewReq, ReviewEntity> uReviewMapReq() {
        TypeMap<ModifyReviewReq, ReviewEntity> typeMap = modelMapper.createTypeMap(ModifyReviewReq.class, ReviewEntity.class);
        return imageToEntity(typeMap);
    }

    public TypeMap<ReviewEntity, SearchOneReviewRes> r1ReviewMapRes() {
        TypeMap<ReviewEntity, SearchOneReviewRes> typeMap = modelMapper.createTypeMap(ReviewEntity.class, SearchOneReviewRes.class);
        return imageToDTO(typeMap);
    }

    public TypeMap<ReviewEntity, ReviewDTO> rReviewMapRes() {
        TypeMap<ReviewEntity, ReviewDTO> typeMap = modelMapper.createTypeMap(ReviewEntity.class, ReviewDTO.class);
        return imageToDTO(typeMap);
    }

    public <S extends ImageListDTO>TypeMap imageToEntity(TypeMap<S, ReviewEntity> typeMap) {
        typeMap.setPostConverter(ctx-> {
            var src = ctx.getSource();
            var des = ctx.getDestination();

            des.getImages().clear();

            try{
                src.getImages().forEach(imgDTO -> des.addImage(modelMapper.map(imgDTO, ImageEntity.class)));
            } catch (NullPointerException e) {
                System.out.println("이미지를 입력하지 않음");
            }
            return des;
        });
        return typeMap;
    }

    public <S extends ImageListDTO>TypeMap imageToDTO(TypeMap<ReviewEntity, S> typeMap) {
        typeMap.setPostConverter(ctx-> {
            var src = ctx.getSource();
            var des = ctx.getDestination();

            des.getImages().clear();

            try{
                src.getImages().forEach(imgEntity -> des.addImage(modelMapper.map(imgEntity, ImageDTO.class)));
            } catch (NullPointerException e) {
                System.out.println("이미지를 입력하지 않음");
            }
            return des;
        });
        return typeMap;
    }
}
