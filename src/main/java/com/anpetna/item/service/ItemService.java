package com.anpetna.item.service;

import com.anpetna.core.coreDto.PageResponseDTO;
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
import org.springframework.web.multipart.MultipartFile;


import java.util.List;

public interface ItemService {

    RegisterItemRes registerItem(RegisterItemReq req, MultipartFile thumb, List<MultipartFile> files);

    ModifyItemRes modifyItem(ModifyItemReq req);

    DeleteItemRes deleteItem(DeleteItemReq req);

    PageResponseDTO<SearchAllItemsRes> getAllItems(SearchAllItemsReq req);

    SearchOneItemRes getOneItem(SearchOneItemReq req);

    void updateStock(Long itemId, Integer itemStock); // ERP 재고관리

    List<PopularItemRes> getPopularItems(PopularItemReq req);

}
