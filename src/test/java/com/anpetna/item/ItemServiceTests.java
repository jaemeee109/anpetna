package com.anpetna.item;

import com.anpetna.coreDto.ImageDTO;
import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.constant.ItemSaleStatus;
import com.anpetna.item.constant.ItemSellStatus;
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
import jakarta.transaction.Transactional;
import org.hibernate.query.SortDirection;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import java.util.List;

@SpringBootTest
@ActiveProfiles("item")
public class ItemServiceTests {

    @Autowired
    ItemService itemService;

    @Test
    public void registerItem() {
        //given
        ImageDTO image1 = ImageDTO.builder()
                .fileName("이미지파일1")
                .url("https://www.baidu.com")
                .sortOrder(1)
                .build();
        ImageDTO image2 = ImageDTO.builder()
                .fileName("이미지파일2")
                .url("https://www.baidu.com")
                .sortOrder(1)
                .build();
        RegisterItemReq req = RegisterItemReq.builder()
                .itemName("test")
                .itemPrice(100)
                .itemStock(200)
                .itemDetail("test")
                .itemCategory(ItemCategory.TOY)
                .itemSellStatus(ItemSellStatus.SELL)
                .itemSaleStatus(ItemSaleStatus.ONSALE)
                .build();
        req.addImage(image1);
        req.addImage(image2);

        //when
        RegisterItemRes res = itemService.registerItem(req);

        //then
        System.out.println(res);
    }

    @Test
    @Transactional
    public void searchOneItem() {
        SearchOneItemReq req = new SearchOneItemReq();
        req.setItemId(1L);
        SearchOneItemRes res = itemService.getOneItem(req);
        System.out.println(res);
    }

   @Test
    public void searchAllItem() {

        SearchAllItemsReq req = new SearchAllItemsReq();

        req.setSortBySale(ItemSellStatus.SOLD_OUT);
        List<ItemDTO> res1 = itemService.getAllItems(req);
        System.out.println(res1);

        req.setSortByCategory(ItemCategory.BATH_PRODUCT);
       List<ItemDTO> res2 = itemService.getAllItems(req);
        System.out.println(res2);

        req.setOrderByPriceDir(SortDirection.ASCENDING);
       List<ItemDTO> res3 = itemService.getAllItems(req);
        System.out.println(res3);

    }

    @Test
    @Transactional
    public void modifyItem(){
        ImageDTO image1 = ImageDTO.builder()
                .fileName("이미지파일1111")
                .url("https://www.baidu.com11111111")
                .sortOrder(1)
                .build();
        ImageDTO image2 = ImageDTO.builder()
                .fileName("이미지파일2111111111")
                .url("https://www.baidu.com111111111")
                .sortOrder(1)
                .build();
        ModifyItemReq req = ModifyItemReq.builder()
                .itemId(952L)
               .itemStock(100)
                .itemDetail("111111111111111111")
                .itemSellStatus(ItemSellStatus.SOLD_OUT)
                .itemSaleStatus(ItemSaleStatus.ORIGIN)
                .build();
        req.addImage(image1);
        req.addImage(image2);

        ModifyItemRes res1 = itemService.modifyItem(req);

        System.out.println(res1);

    }

    @Test
    public void deleteItem(){
        DeleteItemReq req = new DeleteItemReq();
        req.setItemId(1L);
        DeleteItemRes res = itemService.deleteItem(req);
        System.out.println(res);
    }
}
