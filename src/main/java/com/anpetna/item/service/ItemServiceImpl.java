package com.anpetna.item.service;

import com.anpetna.image.service.ImageService;
import com.anpetna.item.config.ItemMapper;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.dto.ItemDTO;
import com.anpetna.item.dto.deleteItem.DeleteItemReq;
import com.anpetna.item.dto.deleteItem.DeleteItemRes;
import com.anpetna.item.dto.modifyItem.ModifyItemReq;
import com.anpetna.item.dto.modifyItem.ModifyItemRes;
import com.anpetna.item.dto.registerItem.RegisterItemReq;
import com.anpetna.item.dto.registerItem.RegisterItemRes;
import com.anpetna.item.dto.searchAllItem.SearchAllItemsReq;
import com.anpetna.item.dto.searchOneItem.SearchOneItemReq;
import com.anpetna.item.dto.searchOneItem.SearchOneItemRes;
import com.anpetna.item.repository.ItemRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ItemServiceImpl implements ItemService {

    private final ImageService imageService;
    private final ModelMapper modelMapper;
    private final ItemMapper itemMapper;
    private final ItemRepository itemRepository;

    @Override
    @Transactional
    public RegisterItemRes registerItem(RegisterItemReq req, List<MultipartFile> files) {
        files.forEach(file -> {
            try {
                req.addImage(imageService.uploadImage(file));
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        });
        ItemEntity item = itemMapper.cItemMapReq().map(req);
        ItemEntity savedItem = itemRepository.save(item);
        RegisterItemRes res = modelMapper.map(savedItem, RegisterItemRes.class);
        return  res.registered();
    }


    @Override
    public ModifyItemRes modifyItem(ModifyItemReq req, List<MultipartFile> files) {
        ItemEntity foundModified = itemMapper.uItemMapReq().map(req);
        ItemEntity saved = itemRepository.save(foundModified);
        ModifyItemRes res = modelMapper.map(saved, ModifyItemRes.class);
        return res.modified();
    }

    @Override
    public DeleteItemRes deleteItem(DeleteItemReq req) {
        itemRepository.deleteById(req.getItemId());
        DeleteItemRes res = DeleteItemRes.builder()
                .itemId(req.getItemId())
                .itemName(req.getItemName())
                .build();
        return res.deleted();
    }

    @Override
    public SearchOneItemRes getOneItem(SearchOneItemReq req) {
        Optional<ItemEntity> found = itemRepository.findById(req.getItemId());
        ItemEntity res = found.orElseThrow(() -> new EntityNotFoundException("Item not found with id: " + req.getItemId()));
        return itemMapper.r1ItemMapRes().map(res);
    }

    @Override
    public Page<ItemDTO> getAllItems(SearchAllItemsReq req){
        Pageable pageable = PageRequest.of(req.getPage(), req.getSize());
        Page<ItemEntity> searchAll = itemRepository.orderBy(pageable, req);
        Page<ItemDTO> res = searchAll.map(itemEntity -> modelMapper.map(itemEntity, ItemDTO.class));
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
}