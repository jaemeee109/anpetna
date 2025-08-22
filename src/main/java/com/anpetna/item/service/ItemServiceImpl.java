package com.anpetna.item.service;

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
import com.anpetna.item.repository.ItemJpaRepository;
import jakarta.persistence.EntityNotFoundException;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ItemServiceImpl implements ItemService {

    private final ItemJpaRepository repository;
    private final ModelMapper modelMapper;
    private final ItemMapper itemMapper;

    //  생성자 주입 관련해 생각해야함..
    public ItemServiceImpl(ItemJpaRepository repository, ItemMapper itemMapper, ModelMapper modelMapper) {
        this.repository = repository;
        this.itemMapper = itemMapper;
        this.modelMapper = modelMapper;
    }

    @Override
    public RegisterItemRes registerItem(RegisterItemReq req) {
        ItemEntity item = itemMapper.cItemMapReq().map(req);
        ItemEntity savedItem = repository.save(item);
        //savedItem.getImages().forEach(m->System.out.println(m.getItem()));
        RegisterItemRes res = modelMapper.map(savedItem, RegisterItemRes.class);
        return  res.registered();
    }

    @Override
    public ModifyItemRes modifyItem(ModifyItemReq req) {
        ItemEntity foundModified = itemMapper.uItemMapReq().map(req);
        ItemEntity saved = repository.save(foundModified);
        ModifyItemRes res = modelMapper.map(saved, ModifyItemRes.class);
        return res.modified();
    }

    @Override
    public DeleteItemRes deleteItem(DeleteItemReq req) {
        repository.deleteById(req.getItemId());
        DeleteItemRes res = DeleteItemRes.builder()
                .itemId(req.getItemId())
                .itemName(req.getItemName())
                .build();
        return res.deleted();
    }

    @Override
    public SearchOneItemRes getOneItem(SearchOneItemReq req) {
        Optional<ItemEntity> found = repository.findById(req.getItemId());
        ItemEntity res = found.orElseThrow(() -> new EntityNotFoundException("Item not found with id: " + req.getItemId()));
        return itemMapper.r1ItemMapRes().map(res);
    }

     @Override
    public List<ItemDTO> getAllItems(SearchAllItemsReq req) {

        List<ItemEntity> found = null;
        //  사용자는 셋 중 하나를 선택하고 DTO에는 값이 하나만 지정된다.
        if (req.getSortByCategory() != null){
            found = repository.sortByCategory(req);
        }else if (req.getSortBySale() != null){
            found = repository.sortBySales(req);
        }else if (req.getOrderByPriceDir() != null){
            found  = repository.orderByPriceDir(req);
        }

        List<ItemDTO> res  = null;
        found.forEach(itemEntity -> {
             res.add(itemMapper.rItemMapRes().map(itemEntity));
         });

        return res;
    }
}