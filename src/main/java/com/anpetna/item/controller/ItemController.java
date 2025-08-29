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
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/item")
@Log4j2
@RequiredArgsConstructor
public class ItemController {

    private final ItemService itemService;

    @PostMapping
    //@PreAuthorize("hasRole('USER')")
    //  컨트롤러나 서비스 메서드 실행 전에 SpEL(Security Expression Language)로 권한 검증
    public ResponseEntity<RegisterItemRes> registerItem(@RequestBody RegisterItemReq registerItemReq) {
        var postResult = itemService.registerItem(registerItemReq);
        return ResponseEntity.ok(postResult);
    }

    @PutMapping
    //@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ModifyItemRes> updateItem(@RequestBody ModifyItemReq modifyItemReq) {
        var putResult = itemService.modifyItem(modifyItemReq);
        return ResponseEntity.ok(putResult);
    }

    @DeleteMapping
    //@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DeleteItemRes> deleteItem(@RequestBody DeleteItemReq deleteItemReq) {
        var deleteResult = itemService.deleteItem(deleteItemReq);
        return ResponseEntity.ok(deleteResult);
    }


    @GetMapping("/{ItemId}")
    //@PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<SearchOneItemRes> searchOneItem(@RequestBody SearchOneItemReq req) {
        var getOneResult = itemService.getOneItem(req);
        return ResponseEntity.ok(getOneResult);
    }

    @GetMapping("/{sortItem}")
   // @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<Page<ItemDTO>> searchAllItems(@RequestBody SearchAllItemsReq req) {
        var getAllResult = itemService.searchItems(req);
        return ResponseEntity.ok(getAllResult);
    }

    //  @PreAuthorize("#id == principal.id")            // 요청 파라미터 id와 로그인 사용자 id 같을 때만 허용
    //  @PreAuthorize("isAuthenticated()")              // 로그인만 되어 있으면 허용
    //  @PreAuthorize("permitAll()")                    // 모두 허용
    //판매량순, 가격순
    //soldout처리
    //onsale여부

}
