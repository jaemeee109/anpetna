package com.anpetna.item.config;

import com.anpetna.coreDomain.ImageEntity;
import com.anpetna.coreDto.ImageDTO;
import com.anpetna.item.dto.ImageListDTO;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.domain.ReviewEntity;
import com.anpetna.item.dto.ReviewDTO;
import com.anpetna.item.dto.modifyReview.ModifyReviewReq;
import com.anpetna.item.dto.registerReview.RegisterReviewReq;
import com.anpetna.item.dto.searchOneReview.SearchOneReviewRes;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.modelmapper.ModelMapper;
import org.modelmapper.TypeMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Log4j2
@Component
@RequiredArgsConstructor(onConstructor = @__(@Autowired))
public class ReviewMapper {


   private final ModelMapper modelMapper;
    //필드를 final로 하는 이유: 불변 보장 + 생성자 DI 권장

    @Transactional
       public TypeMap<RegisterReviewReq, ReviewEntity> cReviewMapReq() {
       TypeMap<RegisterReviewReq, ReviewEntity> typeMap= modelMapper.createTypeMap(RegisterReviewReq.class, ReviewEntity.class);
        //  리뷰pk는 auto incement DB가 자동생성하는 pk로 스킵
        typeMap.addMappings(mapper -> mapper.skip(ReviewEntity::setReviewId));
       // typeMap.addMappings(mapper ->mapper.map(src -> new ItemEntity(src.getItemId()),ReviewEntity::setItem)); -> 엔티티 안 들어감 / Long->Entity로 인식
       log.info(typeMap.getMappings());
        //  setPostConverter : 연관관계, 조건부 매핑, 추가 가공 / 한 번만 사용 가능
       typeMap.setPostConverter(ctx-> {
           var src = ctx.getSource();
           var des = ctx.getDestination();

           // 아이템 fk dto에서 Long으로 받아 ItemEntity 비어있는 객체 만들어 삽입
           if (src.getItemId() == null) {
               return null;
           }
           des.setItem(new ItemEntity(src.getItemId()));

           // 이미지 리스트 DTOtoEntity
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
    //new ItemEntity(src.getItemId())
    //그냥 내가 id만 세팅한 빈 객체 (영속성 컨텍스트에 안 붙어 있음)
    //리뷰 저장할 때 JPA가 “아 이거 Item 엔티티구나, id만 있으니까 FK만 넣으면 되겠네” 하고 INSERT 시 item_id 채워줌


    @Transactional
    public TypeMap<ModifyReviewReq, ReviewEntity> uReviewMapReq() {
        TypeMap<ModifyReviewReq, ReviewEntity> typeMap = modelMapper.createTypeMap(ModifyReviewReq.class, ReviewEntity.class);
        log.info(typeMap.getMappings());
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

    //  후처리 로직이 단순하다면 메서드로 분리시켜도 좋을듯

    @Transactional
    public <S extends ImageListDTO>TypeMap imageToEntity(TypeMap<S, ReviewEntity> typeMap) {
        typeMap.setPostConverter(ctx-> {
            var src = ctx.getSource();
            var des = ctx.getDestination();

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
