package com.anpetna.item.controller;

import com.anpetna.ApiResult;
import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.item.dto.ItemDTO;
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
import com.anpetna.item.service.ItemService;
import jakarta.annotation.Nullable;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/item")
@Log4j2
@RequiredArgsConstructor
public class ItemController {
    //  컨트롤러나 서비스 메서드 실행 전에 SpEL(Security Expression Language)로 권한 검증

    //=============================점검 요소================================
    // item C R1 U D RALL 완
    // 정렬 조건 검토
    // 이미지 수정시 삭제와 입력의 과정
    // 불필요한 어노테이션 정리
    // 프론트에서 구현시 주의사항 정리 및 전달
    // CONTENTTYPE 점검
    // json만 /json & file -> 상품에는 필요없으나 리뷰는 선택 가능하도록
    // 삭제한 상품에 대한 응답처리
    // image 종류별 구분 (thumbnail은 완)
    //=====================================================================

    private final ItemService itemService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ApiResult<RegisterItemRes> registerItem(@RequestPart RegisterItemReq postReq, @RequestPart List<MultipartFile> files ) throws IOException {
        var postRes = itemService.registerItem(postReq, files);
        return new ApiResult<>(postRes);
    }

    //URL → 자원 식별, Body → 수정할 필드들로 역할을 분리
    @PutMapping(value = "/{itemId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ApiResult<ModifyItemRes> updateItem(@PathVariable Long itemId, @RequestPart ModifyItemReq putReq, @RequestPart List<MultipartFile> files) {
        putReq.setItemId(itemId);
        var putRes = itemService.modifyItem(putReq, files);
        return new ApiResult<>(putRes);
    }

    @DeleteMapping("/{itemId}")
    public ApiResult<DeleteItemRes> deleteItem(@PathVariable Long itemId) {
        DeleteItemReq deleteReq = DeleteItemReq.builder()
                .itemId(itemId)
                .build();
        var deleteRes = itemService.deleteItem(deleteReq);
        return new ApiResult<>(deleteRes);
    }

    @GetMapping(value = "/{itemId}")
    public ResponseEntity<SearchOneItemRes> searchOneItemImages(@PathVariable Long itemId) {
        SearchOneItemReq getOneReq = new SearchOneItemReq();
        getOneReq.setItemId(itemId);
        var getOneRes = itemService.getOneItem(getOneReq);
        return ResponseEntity.ok(getOneRes);
    }

    @GetMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<PageResponseDTO<SearchAllItemsRes>> searchAllItems(@RequestBody SearchAllItemsReq getReq) {
        var getAllResult = itemService.getAllItems(getReq);
        return ResponseEntity.ok(getAllResult);
    }

    //클라이언트는 JSON 받아서 리스트 렌더링
    //이미지 <img src="{thumbnailUrl}">로 lazy load 가능

//============================================ 이론 정리 ==========================================
    //PathVariable : 자원을 식별할 때 적합 / RESTful 스타일에서 자주 씀.
    //RequestParam : 검색, 필터링, 옵션 같은 부가 조건에 적합.

    // (@RequestBody RegisterItemReq req)
    // Content-Type: application/json
    // 요청 바디 전체가 JSON이어야 함
    // 파일 업로드 불가

    // (@RequestParam("file") MultipartFile file)
    // multipart/form-data에서 단일 필드 처리
    // 단일 파일이나 간단한 문자열 처리 가능
    // JSON과 함께 보내기 어렵다

    // @RequestPart("item") RegisterItemReq req, @RequestPart(value="images", required=false) List<MultipartFile> files)
    // multipart/form-data 처리용
    // JSON 객체(item) + 파일(images) 동시 전송 가능
    // Postman form-data에서 Text(JSON) + File 같이 보낼 수 있음

    //  @PreAuthorize("#id == principal.id")            // 요청 파라미터 id와 로그인 사용자 id 같을 때만 허용
    //  @PreAuthorize("isAuthenticated()")              // 로그인만 되어 있으면 허용
    //  @PreAuthorize("permitAll()")                    // 모두 허용
    //판매량순, 가격순
    //soldout처리
    //onsale여부

    //@RequestPart를 쓰면 Postman에서 반드시 form-data로 보내야 하고,
    //DTO는 JSON 문자열(Text), 파일은 File 타입으로 넣어야 매핑됩니다.
//============================================ 이론 정리 ==========================================

}
