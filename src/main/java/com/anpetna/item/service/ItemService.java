package com.anpetna.item.service;

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
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;


import java.util.List;


public interface ItemService {

    Page<ItemDTO> searchItems(SearchAllItemsReq req);

    SearchOneItemRes getOneItem(SearchOneItemReq req);

    RegisterItemRes registerItem(RegisterItemReq req);

    ModifyItemRes modifyItem(ModifyItemReq req);

    DeleteItemRes deleteItem(DeleteItemReq req);
}
