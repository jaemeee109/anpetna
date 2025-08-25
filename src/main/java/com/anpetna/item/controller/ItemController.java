package com.anpetna.item.controller;


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
import com.anpetna.item.service.ItemService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequestMapping("/items")
@Log4j2
@RequiredArgsConstructor
public class ItemController {

    private final ItemService itemService;

    @PostMapping
    public ResponseEntity<RegisterItemRes> registerItem(@RequestBody RegisterItemReq registerItemReq) {
        var postResult = itemService.registerItem(registerItemReq);
        return new ResponseEntity<>(postResult, HttpStatus.OK);
    }
/*

    @PutMapping
    public ResponseEntity<ModifyItemRes> updateItem(@RequestBody ModifyItemReq modifyItemReq) {
        var putResult = itemService.modifyItem(modifyItemReq);
        return new ResponseEntity<>(putResult, HttpStatus.OK);
    }

    @DeleteMapping
    public ResponseEntity<DeleteItemRes> deleteItem(@RequestBody DeleteItemReq deleteItemReq) {
        var deleteResult = itemService.deleteItem(deleteItemReq);
        return new ResponseEntity<>(deleteResult, HttpStatus.OK);
    }

    @GetMapping("/{ItemId}")
    public ResponseEntity<SearchOneItemRes> searchOneItem(@RequestBody SearchOneItemReq req) {
        var getOneResult = itemService.getOneItem(req);
        return new ResponseEntity<>(getOneResult, HttpStatus.OK);
    }

    @GetMapping("/{ItemCategory}")
    public ResponseEntity<List<SearchAllItemsRes>> searchAllItems(@RequestBody SearchAllItemsReq req) {
        var getAllResult = itemService.getAllItems(req);
        return new ResponseEntity<>(getAllResult, HttpStatus.OK);
    }

    @GetMapping("/{ItemSellStatus}")
    public ResponseEntity<List<SearchAllReviewsRes>> sortByCategory(@RequestBody SearchAllItemsReq req) {
        var sortByCategory = itemService.getAllItems(req);
        return new ResponseEntity<>(sortByCategory, HttpStatus.OK);
    }

    @GetMapping("/{ItemSaleStatus}")
    public ResponseEntity<ItemDTO> OrderBy(@RequestBody SearchAllItemsReq req) {
        var OrderBy = itemService.getAllItems(req);
        return new ResponseEntity<>(OrderBy, HttpStatus.OK);
    }
*/

    //판매량순, 가격순
    //soldout처리
    //onsale여부

}
