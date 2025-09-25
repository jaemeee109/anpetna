package com.anpetna.item.service;

import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.image.domain.ImageEntity;
import com.anpetna.image.dto.ExistingImageDTO;
import com.anpetna.image.dto.ImageDTO;
import com.anpetna.image.dto.NewImageDTO;
import com.anpetna.image.repository.ImageRepository;
import com.anpetna.image.service.LocalStorage;
import com.anpetna.item.config.ItemMapper;
import com.anpetna.item.constant.ItemSellStatus;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.dto.ItemSalesDTO;
import com.anpetna.item.dto.deleteItem.DeleteItemReq;
import com.anpetna.item.dto.deleteItem.DeleteItemRes;
import com.anpetna.item.dto.modifyItem.ModifyItemReq;
import com.anpetna.item.dto.modifyItem.ModifyItemRes;
import com.anpetna.item.dto.popularItem.PopularItemReq;
import com.anpetna.item.dto.popularItem.PopularItemRes;
import com.anpetna.item.dto.registerItem.RegisterItemReq;
import com.anpetna.item.dto.registerItem.RegisterItemRes;
import com.anpetna.item.dto.searchAllItem.SearchAllItemsReq;
import com.anpetna.item.dto.searchAllItem.SearchAllItemsRes;
import com.anpetna.item.dto.searchOneItem.SearchOneItemReq;
import com.anpetna.item.dto.searchOneItem.SearchOneItemRes;
import com.anpetna.item.repository.ItemRepository;
import jakarta.persistence.EntityNotFoundException;

import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
@Log4j2
@Transactional
public class ItemServiceImpl implements ItemService {

    private final LocalStorage fileService;
    private final ModelMapper modelMapper;
    private final ItemMapper itemMapper;
    private final ItemRepository itemRepository;
    private final ImageRepository imageRepository;


    @Override
    @Transactional
    public RegisterItemRes registerItem(RegisterItemReq req, MultipartFile thumb, List<MultipartFile> files) {
        // 있을테니 넣는다
        req.addImage(fileService.uploadFile(thumb, 0));
        // 있으면 넣는다
        if (files != null && !files.isEmpty()) {
            Integer sortOrder = 1;
            for (MultipartFile file : files) {
                req.addImage(fileService.uploadFile(file, sortOrder));
                sortOrder++;
            }
        }
        ItemEntity item = itemMapper.cItemMapReq().map(req);
        ItemEntity savedItem = itemRepository.save(item);
        RegisterItemRes res = modelMapper.map(savedItem, RegisterItemRes.class);
        return res.registered();
    }

    @Override
    @Transactional
    public ModifyItemRes modifyItem(ModifyItemReq req) {
        // 1. persistent 상태의 itemEntity
        ItemEntity item = itemRepository.findById(req.getItemId())
                .orElseThrow(() -> new EntityNotFoundException("Item not found with id " + req.getItemId()));

        // 2. item 정보 수정
        modelMapper.map(req, item);

        // 3. 썸네일 수정
        MultipartFile thumb = req.getNewThumb();
        if (thumb != null && !thumb.isEmpty()) {
            // 삭제
            fileService.deleteFile(req.getExistingThumb());
            item.getImages().remove(0);

            // 추가
            ImageDTO newImg = fileService.uploadFile(thumb, 0);
            ImageEntity newImage = modelMapper.map(newImg, ImageEntity.class);
            item.setImage(newImage, 0);
        }

        // 4. 기존 이미지 삭제 (삭제 대상 찾기 -> Entity -> Storage)
        List<ExistingImageDTO> existings = req.getExistingImages();
        if (existings != null && !existings.isEmpty()) {
            List<String> keep = existings.stream()
                    .map(ExistingImageDTO::getFileName)
                    .toList();  //순서 보장을 위해 List 처리

            //ImageEntity에서 썸네일 제외, keep에 포함되어 있으면 제외
            List<ImageEntity> toDelete = item.getImages().stream()
                    .filter(img -> img.getSortOrder() >= 1) // 입력시 sort 입력하므로 유무 검증은 안 해도 됨.
                    .filter(img -> !keep.contains(img.getFileName()))
                    .toList();
            item.getImages().removeAll(toDelete);
            for (ImageEntity delete : toDelete) {
                fileService.deleteFile(delete.getFileName());
            }

            // 5. 기존 이미지 정렬 조건 업데이트
            for (ExistingImageDTO existing : existings) {
                item.getImages().stream()
                        .filter(img -> img.getFileName().equals(existing.getFileName()))
                        .findFirst()    // Optional이 안전... 바로 map 하는 것보다
                        .ifPresent(img -> img.setSortOrder(existing.getSortOrder()));
            }
        } else { //null 또는 빈 리스트
            if (item.getImages().size() > 1) {
                List<ImageEntity> toDelete = item.getImages().subList(1, item.getImages().size());
                item.getImages().removeAll(toDelete);

                for (ImageEntity delete : toDelete) {
                    fileService.deleteFile(delete.getFileName());
                }
            }
        }

        // 6. 이미지 추가 (fileName & sortOrder)
        List<NewImageDTO> newImages = req.getNewImages();
        if (newImages != null && !newImages.isEmpty()) {
            for (NewImageDTO newImageDTO : newImages) {
                ImageDTO imageDTO = fileService.uploadFile(newImageDTO.getFile(), newImageDTO.getSortOrder());
                item.addImage(modelMapper.map(imageDTO, ImageEntity.class));
            }
        }

        ModifyItemRes res = modelMapper.map(item, ModifyItemRes.class);
        return res.modified();
    }

    @Override
    @Transactional
    public DeleteItemRes deleteItem(DeleteItemReq req) {
        List<String> images = imageRepository.getFileName(req.getItemId());

        itemRepository.deleteById(req.getItemId());
        itemRepository.flush();

        for (String fileName : images) {
            fileService.deleteFile(fileName);
        }

        return DeleteItemRes.builder()
                .itemId(req.getItemId())
                .build();
    }

    @Override
    public SearchOneItemRes getOneItem(SearchOneItemReq req) {
        ItemEntity found = itemRepository.findById(req.getItemId())
                .orElseThrow(() -> new EntityNotFoundException("Item not found with id " + req.getItemId()));

        SearchOneItemRes res = modelMapper.map(found, SearchOneItemRes.class);

        String thumbUrl = found.getImages().get(0).getUrl();
        res.setThumbnailUrl(thumbUrl);

        List<String> imageUrls = found.getImages().stream()
                .skip(1)
                .map(ImageEntity::getUrl)
                .toList();
        res.setImageUrls(imageUrls);

        return res;
    }

    @Override
    public PageResponseDTO<SearchAllItemsRes> getAllItems(SearchAllItemsReq req) {
        Pageable pageable = PageRequest.of(req.getPage(), req.getSize());
        Page<ItemEntity> searchAll = null;
        if (req.getOrderBySales() == null) {
            searchAll = itemRepository.orderBy(pageable, req);
        } else {
            List<ItemSalesDTO> itemList = itemRepository.rankSalesQuantity();
            itemList.forEach(itemSalesDTO -> log.info(itemSalesDTO.getQuantity() + itemSalesDTO.getItem().toString()));
            List<ItemEntity> itemEntityList = itemList.stream().map(ItemSalesDTO::getItem).toList();
            searchAll = new PageImpl<>(itemEntityList, pageable, itemEntityList.size());
        }

        return PageResponseDTO.toDTO(searchAll, itemEntity -> {
            SearchAllItemsRes resEach = modelMapper.map(itemEntity, SearchAllItemsRes.class);
            String entityUrl = itemEntity.getImages().get(0).getUrl();
            resEach.setThumbnailUrl(entityUrl);
            return resEach;
        }, pageable);
    }

    @Override
    @Transactional(readOnly=true)
    public List<PopularItemRes> getPopularItems(PopularItemReq req) {
        return itemRepository.rankSalesQuantity().stream()
                .filter(row ->
                        !req.isSellOnly() || row.getItem().getItemSellStatus() == ItemSellStatus.SELL)
                .limit(5) // Top-5 고정
                .map(row -> PopularItemRes.from(row.getItem()))
                .toList();
    }


    // --- 상품 등록 ---
    // 파일 업로드 + DB 저장 전체를 하나의 트랜잭션으로

    //Spring @Transactional에서 트랜잭션 롤백 기본 조건:
    //RuntimeException 또는 Error 발생 시 자동 롤백
    //체크 예외는 기본적으로 롤백되지 않음 → 롤백하려면 RuntimeException으로 래핑해야 함

    //💡 트랜잭션
    //- 데이터베이스 작업을 '원자적으로 처리'하기 위한 메커니즘을 의미
    //- 여러 개의 데이터베이스 작업을 하나의 논리적 단위로 묶어서 실행하고 모든 작업이 성공적으로 완료하면 '커밋'하거나 실패할 경우 '롤백'하는 기능을 제공

    // --- 상품 상세 읽기 ---
    //이미지 url의 String 처리
    //.stream() → 리스트를 순회하겠다고 선언
    //.map(ImageEntity::getUrl) → 각 ImageEntity에서 getUrl()만 꺼내라
    //.toList() → 결과를 리스트로 모아라
    //동일 코드
    //List<String> imageUrls = new ArrayList<>();
    //for (ImageEntity image : found.getImages()) {imageUrls.add(image.getUrl());}

    // --- 상품 전체 읽기 ---
    //팩토리 메서드 : 객체 생성 로직을 캡슐화해서, 외부에서 new를 직접 호출하지 않고도 객체를 생성하도록 하는 패턴
    //생성자 대신 사용 : 복잡한 생성 로직이나 변환이 필요할 때 유용
    //재사용성, 가독성 향상 : 공통 변환 로직을 한 곳에 모아두면 코드 중복 감소

    // --- 상품 수정 ---
    //프론트 구상
    //사용자가 지정하는 방식은 결국 UI에서 이미지 순서를 드래그·드롭 또는 번호 입력
    //프론트 UI 예시
    //썸네일 뷰 + 기존 이미지
    //드래그앤드롭으로 순서 변경
    //삭제 버튼으로 이미지 제거
    //새 이미지 업로드
    //업로드 후 원하는 위치로 드래그해서 순서 지정

    //noneMatch : 스트림 안에서 조건을 만족하는 요소가 하나도 없으면 true를 반환하는 메서드
    //조건에 맞는 이미지를 컬렉션에서 제거 (req에 들어있는 파일이름에 속하지 않으면)
    //이미 uuid 포함된 파일이름 지정으로 파일이름만 받아와도 unique 구분가능
    //단순 set(index, newImage)는 orphanRemoval이 true여도 index 교체 여부에 따라 DB 삭제가 확실치 않을 수 있음
    //실무에서는 set보다 remove + add 패턴을 쓰는 경우가 대부분

    // --- 상품 삭제 ---
    //DB 삭제 후 바로 응답, 파일 삭제는 별도
    //파일 삭제는 별도 스레드/큐에서 비동기 처리
    //@Async나 메시지 큐(RabbitMQ, Kafka 등)로 처리.
    //사용자 요청과 로컬 I/O가 분리되어 응답 지연 최소화.

    //DTO에서 키 받아서 삭제
    //호출자가 직접 어떤 키를 삭제할지 선택 가능
    //클라이언트가 key를 알고 있어야 함 → 보안 취약, 실수 가능
    //DB에서 키 조회 후 삭제(현재 코드)
    //서버에서 안전하게 처리, 클라이언트에 key 노출 불필요
    //DB 조회 추가 필요, 트랜잭션 관리 필요

    // --- @Transactional ---
    //트랜잭션 = DB 작업의 논리적 단위
    //원자성(Atomicity): 모든 작업이 완료되거나 전혀 적용되지 않음
    //일관성(Consistency): 트랜잭션 전/후 DB 상태가 항상 일관
    //격리성(Isolation): 다른 트랜잭션의 중간 작업에 영향 없음
    //지속성(Durability): 트랜잭션 커밋 후 영구 반영

    // --- flush ---
    //현재 영속성 컨텍스트(Persistence Context)에 쌓인 변경 내용을 즉시 DB에 반영.
    //삭제나 변경을 즉시 반영 → 이후 로직에서 DB 상태 확인 가능.
    //트랜잭션 내에서 DB 제약 조건 체크 → FK, NOT NULL 등 위반 여부 즉시 확인.

    // --- Entity의 생명주기 ---
    //엔티티 생명주기 정리하면:
    //new / transient
    //그냥 new Entity() 한 상태. 아직 영속성 컨텍스트에 등록 안 됨.
    //managed / persistent
    //em.persist() 하거나 find() 해서 가져온 상태. 영속성 컨텍스트가 추적 중이라, 값 바꾸면 flush 시점에 DB 업데이트 쿼리 나감.
    //detached
    //트랜잭션 끝나면서 컨텍스트가 닫히면, 관리 끊김. 이때부터는 엔티티 속성 바꿔도 DB 반영 안 됨. merge()해야 다시 관리 상태로 들어감.
    //removed
    //삭제 예약된 상태. flush 시점에 delete 쿼리.

    //조회 + 수정은 트랜잭션 안에서 → dirty checking으로 자동 반영.
    //detached 엔티티는 건드려도 DB 안 바뀜.
    //save() 호출은 신규 insert나 detached 객체 merge 같은 특수 케이스에만 필요.

    //트랜잭션 안에서 엔티티를 조회하면 영속성 컨텍스트가 그 엔티티를 스냅샷으로 저장합니다.
    //엔티티 수정
    //트랜잭션이 끝날 때 flush 발생 → 영속성 컨텍스트가 스냅샷과 현재 값을 비교.
    //commit 시점에 DB에 반영.

    //ChatGPT의 말:
    //
    //네, 실무에서 서비스단에서 EntityManager를 직접 쓰는 경우가 있습니다. 하지만 보통은 Spring Data JPA의 Repository만 쓰는 게 대부분이라 드물긴 합니다.
    //
    //1. 서비스단에서 EntityManager를 쓰는 이유
    //
    //복잡한 연관관계 처리
    //
    //컬렉션 합치기, orphanRemoval, flush 타이밍 조절 등
    //
    //Repository 메서드만으로 처리하기 어렵거나 성능 최적화가 필요할 때
    //
    //동적 쿼리 / JPQL / Native SQL
    //
    //Repository에서 제공하는 메서드만으로는 불가능한 복잡한 조회
    //
    //트랜잭션 내 flush / detach / merge 제어
    //
    //즉시 DB 반영이 필요하거나, 일부 엔티티만 영속성 컨텍스트에서 분리하고 싶을 때

    // --- Stream ---
    //| `filter`    | 조건에 맞는 요소만 남김
    //| `map`       | 요소를 다른 형태로 변환
    //| `forEach`   | 요소 소비, 출력 등
    //| `collect`   | 결과를 List, Set, Map 등으로 수집
    //| `anyMatch`  | 조건 만족 요소 하나라도 있으면 true
    //| `allMatch`  | 모든 요소가 조건 만족하면 true
    //| `noneMatch` | 조건 만족 요소가 하나도 없으면 true
    //| `findFirst` | 첫 번째 요소 반환(Optional)

    //엔티티는 DB 중심 설계
    //
    //Persistent 상태, Lazy Loading, JPA 관리 등 DB 연동 특성이 있음
    //
    //파일 I/O, 스트림 처리 등과 섞으면 의도치 않은 트랜잭션 연장, LazyInitializationException 등이 발생할 수 있음
    //
    //단일 책임 원칙 위반
    //
    //엔티티가 DB 상태 + 파일 업로드/삭제까지 책임지게 됨 → 유지보수 어려움
    //
    //테스트/재사용성 저하
    //
    //파일 시스템 연동 코드를 엔티티에 넣으면 유닛 테스트가 복잡해짐

    //catch (IOException e) {throw new RuntimeException(e);}
    //업로드 실패했는데 클라이언트에 에러를 알려줄 방법이 불명확해짐.
    //나중에 호출하는 서비스/컨트롤러가 "이게 네트워크 문제였는지, 서버 버그였는지" 구분 못함.
    //결국 장애 분석할 때 로그 뒤지면서 Caused by: IOException 찾는 일이 생김.
}