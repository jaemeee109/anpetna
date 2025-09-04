package com.anpetna.item;

import com.anpetna.image.dto.ImageDTO;
import com.anpetna.item.dto.deleteReview.DeleteReviewReq;
import com.anpetna.item.dto.deleteReview.DeleteReviewRes;
import com.anpetna.item.dto.modifyReview.ModifyReviewReq;
import com.anpetna.item.dto.modifyReview.ModifyReviewRes;
import com.anpetna.item.dto.registerReview.RegisterReviewReq;
import com.anpetna.item.dto.registerReview.RegisterReviewRes;
import com.anpetna.item.service.ReviewService;
import lombok.extern.log4j.Log4j2;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@Log4j2
@SpringBootTest
@ActiveProfiles("item")
public class ReviewServiceTests {

    @Autowired
    ReviewService reviewService;

    @Test
    public void registerReview() {
        //given
        ImageDTO image1 = ImageDTO.builder()
                .fileName("리뷰용 이미지1")
                .url("https://www.baidu.com")
                .sortOrder(1)
                .build();
        ImageDTO image2 = ImageDTO.builder()
                .fileName("리뷰용 이미지2")
                .url("https://www.baidu.com")
                .sortOrder(2)
                .build();
        RegisterReviewReq req = RegisterReviewReq.builder()
                .content("리뷰 내용")
                .itemId(1L)
                .rating(1)
                .build();
        req.addImage(image1);
        req.addImage(image2);

        //when
        RegisterReviewRes res = reviewService.registerReview(req);

        //then
        log.info(res);
    }

/*    @Test
    @Transactional
    public void searchOneReview() {
        SearchOneReviewReq req = new SearchOneReviewReq();
        req.setReviewId(1L);
        SearchOneReviewRes res = reviewService.getOneReview(req);
        System.out.println(res);
    }*/

/*    @Test
    public void searchAllItem() {

        SearchAllItemsReq req = new SearchAllItemsReq();

        req.setSortBySale(ItemSellStatus.SOLD_OUT);
        List<ItemDTO> res1 = reviewService.getAllReviews(req);
        System.out.println(res1);

        req.setSortByCategory(ItemCategory.BATH_PRODUCT);
        List<ItemDTO> res2 = reviewService.getAllItems(req);
        System.out.println(res2);

        req.setOrderByPriceDir(SortDirection.ASCENDING);
        List<ItemDTO> res3 = reviewService.getAllItems(req);
        System.out.println(res3);

    }*/

    @Test
    public void modifyReview(){
        //  item은 건드릴 필요없음
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
        ModifyReviewReq req = ModifyReviewReq.builder()
                .content("수정된 내용")
                .rating(5)
                .build();
        req.addImage(image1);
        req.addImage(image2);

        ModifyReviewRes res1 = reviewService.modifyReview(req);

        System.out.println(res1);

    }

    @Test
    public void deleteItem(){
        DeleteReviewReq req = new DeleteReviewReq();
        req.setReviewId(1L);
        DeleteReviewRes res = reviewService.deleteReview(req);
        System.out.println(res);
    }
}