package com.anpetna.item.service;

import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.image.domain.ImageEntity;
import com.anpetna.image.repository.ImageRepository;
import com.anpetna.image.service.LocalStorage;
import com.anpetna.item.config.ItemMapper;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.dto.deleteItem.DeleteItemReq;
import com.anpetna.item.dto.deleteItem.DeleteItemRes;
import com.anpetna.item.dto.modifyItem.ModifyItemReq;
import com.anpetna.item.dto.modifyItem.ModifyItemRes;
import com.anpetna.item.dto.registerItem.RegisterItemReq;
import com.anpetna.item.dto.registerItem.RegisterItemRes;
import com.anpetna.item.dto.searchAllItem.SearchAllItemsReq;
import com.anpetna.item.dto.searchAllItem.SearchAllItemsRes;
import com.anpetna.item.dto.searchOneItem.SearchOneItemReq;
import com.anpetna.item.dto.searchOneItem.SearchOneItemRes;
import com.anpetna.item.repository.ItemRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import static org.springframework.data.jpa.domain.AbstractPersistable_.id;

@Service
@RequiredArgsConstructor
@Log4j2
public class ItemServiceImpl implements ItemService {

    private final LocalStorage fileService;
    private final ModelMapper modelMapper;
    private final ItemMapper itemMapper;
    private final ItemRepository itemRepository;
    private final ImageRepository imageRepository;

    //catch (IOException e) {throw new RuntimeException(e);}
    //업로드 실패했는데 클라이언트에 에러를 알려줄 방법이 불명확해짐.
    //나중에 호출하는 서비스/컨트롤러가 "이게 네트워크 문제였는지, 서버 버그였는지" 구분 못함.
    //결국 장애 분석할 때 로그 뒤지면서 Caused by: IOException 찾는 일이 생김.

    @Override
    @Transactional
    public RegisterItemRes registerItem(RegisterItemReq req, MultipartFile thumb, List<MultipartFile> files){
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
        return  res.registered();
    }

    @Override
    public ModifyItemRes modifyItem(ModifyItemReq req, MultipartFile thumb, List<MultipartFile> files) {
      //  itemRepository.deleteImages(req.getDeleteImages());
        if (files != null && !files.isEmpty()) {
            files.forEach(file -> {
                  //  req.addImage(fileService.uploadFile(file));
            });
        }
        ItemEntity foundModified = itemMapper.uItemMapReq().map(req);
        ItemEntity saved = itemRepository.save(foundModified);
        ModifyItemRes res = modelMapper.map(saved, ModifyItemRes.class);
        return res.modified();
    }


    @Override
    @Transactional
    public DeleteItemRes deleteItem(DeleteItemReq req) {
        List<String> images= imageRepository.getFileName(req.getItemId());

        itemRepository.deleteById(req.getItemId());
        itemRepository.flush();

        for(String fileName : images){
            fileService.deleteFile(fileName);
        }

        return DeleteItemRes.builder()
                .itemId(req.getItemId())
                .build();
    }

    @Override
    public SearchOneItemRes getOneItem(SearchOneItemReq req) {
        ItemEntity found = itemRepository.findById(req.getItemId())
                .orElseThrow(() -> new EntityNotFoundException("Item not found with id " + id));

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
    public PageResponseDTO<SearchAllItemsRes> getAllItems(SearchAllItemsReq req){
        Pageable pageable = PageRequest.of(req.getPage(), req.getSize());
        Page<ItemEntity> searchAll = itemRepository.orderBy(pageable, req);

        PageResponseDTO<SearchAllItemsRes> res = PageResponseDTO.toDTO(searchAll, itemEntity -> {
            SearchAllItemsRes resEach = modelMapper.map(itemEntity, SearchAllItemsRes.class);
            String entityUrl = itemEntity.getImages().get(0).getUrl();
            resEach.setThumbnailUrl(entityUrl);
            return resEach;
        });

        return res;
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
}