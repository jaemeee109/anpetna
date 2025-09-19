package com.anpetna.item.config;

import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.domain.ReviewEntity;
import com.anpetna.item.dto.ItemDTO;
import com.anpetna.item.dto.ReviewDTO;
import com.anpetna.item.dto.modifyReview.ModifyReviewReq;
import com.anpetna.item.dto.registerReview.RegisterReviewReq;
import com.anpetna.item.dto.searchOneReview.SearchOneReviewRes;
import lombok.RequiredArgsConstructor;
import org.modelmapper.Conditions;
import org.modelmapper.ModelMapper;
import org.modelmapper.TypeMap;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ReviewMapper {

   private final ModelMapper modelMapper;

   public TypeMap<RegisterReviewReq, ReviewEntity> cReviewMapReq() {
       TypeMap<RegisterReviewReq, ReviewEntity> typeMap = modelMapper.getTypeMap(RegisterReviewReq.class, ReviewEntity.class);
       if(typeMap==null){
           typeMap = modelMapper.createTypeMap(RegisterReviewReq.class, ReviewEntity.class);
       }
       typeMap.addMappings(mapper -> {
           mapper.skip(ReviewEntity::setItemId);
           mapper.skip(ReviewEntity::setMemberId);
       });
       return typeMap;
   }

    public TypeMap<ModifyReviewReq, ReviewEntity> uReviewMapReq() {
        TypeMap<ModifyReviewReq, ReviewEntity> typeMap = modelMapper.getTypeMap(ModifyReviewReq.class, ReviewEntity.class);
        if(typeMap==null){
            typeMap = modelMapper.createTypeMap(ModifyReviewReq.class, ReviewEntity.class);
        }
        typeMap.setPropertyCondition(Conditions.isNotNull());
        typeMap.addMappings(mapper -> {
            mapper.skip(ReviewEntity::setItemId);
            mapper.skip(ReviewEntity::setMemberId);
        });
        return typeMap;
    }

    public TypeMap<ReviewEntity, SearchOneReviewRes> r1ReviewMapRes() {
        itemEntityToDto();
        TypeMap<ReviewEntity, SearchOneReviewRes> typeMap = modelMapper.getTypeMap(ReviewEntity.class, SearchOneReviewRes.class);
        if(typeMap==null){
            typeMap = modelMapper.createTypeMap(ReviewEntity.class, SearchOneReviewRes.class);
        }
        typeMap.addMappings(mapper -> {
            mapper.map(ReviewEntity::getItemId, SearchOneReviewRes::setItemId);
        });
        return typeMap;
    }

    public TypeMap<ReviewEntity, ReviewDTO> rReviewMapRes() {
        itemEntityToDto();

        // 기존 typeMap 재사용 확인
        TypeMap<ReviewEntity, ReviewDTO> typeMap = modelMapper.getTypeMap(ReviewEntity.class, ReviewDTO.class);
        if (typeMap == null) {
            typeMap = modelMapper.createTypeMap(ReviewEntity.class, ReviewDTO.class);
        }

        // itemId 매핑 유지
        typeMap.addMappings(mapper -> mapper.map(ReviewEntity::getItemId, ReviewDTO::setItemId));

        // imageUrl + writer 매핑을 한 postConverter에서 처리
        typeMap.setPostConverter(ctx -> {
            ReviewEntity src = ctx.getSource();
            ReviewDTO dest = ctx.getDestination();

            // 이미지 매핑 (null-safe)
            if (src.getImage() != null) {
                dest.setImageUrl(src.getImage().getUrl());
            } else {
                dest.setImageUrl(null);
            }

            // 작성자 아이디 매핑 (null-safe)
            try {
                if (src != null && src.getMemberId() != null && src.getMemberId().getMemberId() != null) {
                    dest.setWriter(src.getMemberId().getMemberId());
                }
            } catch (Exception ignore) { }

            return dest;
        });

        return typeMap;
    }




    private TypeMap<ItemEntity, ItemDTO> itemEntityToDto() {
        TypeMap<ItemEntity, ItemDTO> typeMap = modelMapper.getTypeMap(ItemEntity.class, ItemDTO.class);
        if (typeMap == null) {
            typeMap = modelMapper.createTypeMap(ItemEntity.class, ItemDTO.class);
            typeMap.addMappings(m -> {
                m.map(ItemEntity::getItemId, ItemDTO::setItemId);
                m.map(ItemEntity::getItemName, ItemDTO::setItemName);
                m.map(ItemEntity::getItemPrice, ItemDTO::setItemPrice);
                m.map(ItemEntity::getItemStock, ItemDTO::setItemStock);
                m.map(ItemEntity::getItemDetail, ItemDTO::setItemDetail);
                m.map(ItemEntity::getItemSellStatus, ItemDTO::setItemSellStatus);
                m.map(ItemEntity::getItemCategory, ItemDTO::setItemCategory);
            });
        }
        return typeMap;
    }


/*    public <S extends ImageListDTO>TypeMap imageToEntity(TypeMap<S, ReviewEntity> typeMap) {
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
    }*/
}
