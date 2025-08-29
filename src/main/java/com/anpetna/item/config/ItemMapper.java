package com.anpetna.item.config;

import com.anpetna.core.coreDomain.ImageEntity;
import com.anpetna.core.coreDto.ImageDTO;
import com.anpetna.core.coreDto.ImageListDTO;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.dto.ItemDTO;
import com.anpetna.item.dto.modifyItem.ModifyItemReq;
import com.anpetna.item.dto.registerItem.RegisterItemReq;
import com.anpetna.item.dto.searchOneItem.SearchOneItemRes;
import org.modelmapper.ModelMapper;
import org.modelmapper.TypeMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;


@Component
public class ItemMapper {

    @Autowired
   private ModelMapper modelMapper = new ModelMapper();
    //  필드를 final로 꼭 해야하는가

   public TypeMap<RegisterItemReq, ItemEntity> cItemMapReq() {
       TypeMap<RegisterItemReq, ItemEntity> typeMap = modelMapper.getTypeMap(RegisterItemReq.class, ItemEntity.class);
       if (typeMap==null) {
           typeMap = modelMapper.createTypeMap(RegisterItemReq.class, ItemEntity.class);
       }
       typeMap.addMappings(mapper -> mapper.skip(ItemEntity::setItemId));
       return imageToEntity(typeMap);
   }

    public TypeMap<ModifyItemReq, ItemEntity> uItemMapReq() {
        TypeMap<ModifyItemReq, ItemEntity> typeMap = modelMapper.createTypeMap(ModifyItemReq.class, ItemEntity.class);
        return imageToEntity(typeMap);
    }

    public TypeMap<ItemEntity, SearchOneItemRes> r1ItemMapRes() {
        TypeMap<ItemEntity, SearchOneItemRes> typeMap = modelMapper.createTypeMap(ItemEntity.class, SearchOneItemRes.class);
        return imageToDTO(typeMap);
    }


    public TypeMap<ItemEntity, ItemDTO> rItemMapRes() {
        TypeMap<ItemEntity, ItemDTO> typeMap = modelMapper.getTypeMap(ItemEntity.class, ItemDTO.class);
        if (typeMap==null) {
            typeMap = modelMapper.createTypeMap(ItemEntity.class, ItemDTO.class);
        }
        return imageToDTO(typeMap);
    }

    public <S extends ImageListDTO>TypeMap imageToEntity(TypeMap<S, ItemEntity> typeMap) {
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

    public <S extends ImageListDTO>TypeMap imageToDTO(TypeMap<ItemEntity, S> typeMap) {
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
