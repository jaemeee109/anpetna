package com.anpetna.item.service;

import com.anpetna.coreDomain.ImageEntity;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import static com.anpetna.coreDomain.QImageEntity.imageEntity;

@Service
public class ItemServiceImpl implements ItemService {

    @Autowired
    private ItemJpaRepository repository;
    private ModelMapper modelMapper = new ModelMapper();
    private ItemMapper itemMapper = new ItemMapper();

    @Override
    public RegisterItemRes registerItem(RegisterItemReq req) {
        ItemEntity item = itemMapper.cItemMapReq().map(req);
        ItemEntity savedItem = repository.save(item);
        savedItem.getImages().forEach(m->System.out.println(m.getItem()));
        RegisterItemRes res = modelMapper.map(savedItem, RegisterItemRes.class);
        return  res.registered();
    }

    @Override
    public ModifyItemRes modifyItem(ModifyItemReq req) {
        ItemEntity foundModified = repository.findById(req.getItemId()).orElse(null);
        foundModified = itemMapper.uItemMapReq().map(req);
        ItemEntity saved = repository.save(foundModified);
        ModifyItemRes res = modelMapper.map(foundModified, ModifyItemRes.class);
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
/*         List<ItemEntity> found = repository.findAll();
        if (req.getSortByCategory() != null){
            found = repository.sortByCategory(req);
        }else if (req.getSortBySale() != null){
            found = repository.orderBySales(req);
        }else if (req.getSortByPrice() != null){
            found  = repository.orderByPrice(req);
        }
         List<ItemDTO> res = found.stream()
                 .map(entity -> modelMapper.map(entity, ItemDTO.class))
                 .collect(Collectors.toList());
        return res;*/
         return null;
    }



}