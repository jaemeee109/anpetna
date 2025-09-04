package com.anpetna.item.config;

import com.anpetna.image.domain.ImageEntity;
import com.anpetna.image.dto.ImageListDTO;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.dto.modifyItem.ModifyItemReq;
import com.anpetna.item.dto.registerItem.RegisterItemReq;
import com.anpetna.item.dto.searchOneItem.SearchOneItemRes;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.modelmapper.ModelMapper;
import org.modelmapper.TypeMap;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Log4j2
public class ItemMapper {

    private final ModelMapper modelMapper;

    public TypeMap<RegisterItemReq, ItemEntity> cItemMapReq() {
        TypeMap<RegisterItemReq, ItemEntity> typeMap = modelMapper.getTypeMap(RegisterItemReq.class, ItemEntity.class);
        if (typeMap == null) {
            typeMap = modelMapper.createTypeMap(RegisterItemReq.class, ItemEntity.class);
        }
        typeMap.addMappings(mapper -> mapper.skip(ItemEntity::setItemId));
        return imageToEntity(typeMap);
    }

    public TypeMap<ModifyItemReq, ItemEntity> uItemMapReq() {
        TypeMap<ModifyItemReq, ItemEntity> typeMap = modelMapper.getTypeMap(ModifyItemReq.class, ItemEntity.class);
        if (typeMap == null) {
            typeMap = modelMapper.createTypeMap(ModifyItemReq.class, ItemEntity.class);
        }
        return imageToEntity(typeMap);
    }

    public TypeMap<ItemEntity, SearchOneItemRes> rOneItemMapRes() {
        TypeMap<ItemEntity, SearchOneItemRes> typeMap = modelMapper.getTypeMap(ItemEntity.class, SearchOneItemRes.class);
        if (typeMap == null) {
            typeMap = modelMapper.createTypeMap(ItemEntity.class, SearchOneItemRes.class);
        }
        typeMap.setPostConverter(ctx -> {
            var src = ctx.getSource();
            var des = ctx.getDestination();
            try {
                src.getImages().forEach(imgEntity -> des.addImageUrl(imgEntity.getUrl()));
            } catch (NullPointerException e) {
                des.setImageUrl(null);
            }
            return des;
        });
        return typeMap;
    }

    public <S extends ImageListDTO> TypeMap imageToEntity(TypeMap<S, ItemEntity> typeMap) {
        typeMap.setPostConverter(ctx -> {
            var src = ctx.getSource();
            var des = ctx.getDestination();
            if (src.getImages() != null) {
                des.getImages().clear();
                try {
                    src.getImages().forEach(imgDTO -> des.addImage(modelMapper.map(imgDTO, ImageEntity.class)));
                } catch (NullPointerException e) {
                    log.info("이미지를 입력하지 않음");
                }
                return des;
            }
            return des;
        });
        return typeMap;
    }

}
