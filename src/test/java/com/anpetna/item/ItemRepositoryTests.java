package com.anpetna.item;

import com.anpetna.coreDomain.ImageEntity;
import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.constant.ItemSellStatus;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.repository.ItemRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@EnableJpaAuditing
@SpringBootTest
// @Transactional
public class ItemRepositoryTests {

    //  테스트 전 환경/상태를 준비
    //  테스트 대상 행동 수행
    //  기대 결과 검증

    @Autowired
    ItemRepository itemRepository;

    @Test
    public void insert() {

        //  Given
        ItemEntity item = ItemEntity.builder()
                .itemName("상품명")
                .itemPrice(100)
                .itemStock(200)
                .itemDetail("상품 상세 설명")
                .itemCategory(ItemCategory.FEED)
                .itemSellStatus(30)
                .itemSaleStatus(1)
                .build();
        ImageEntity.forItem("fileName1", "url1", item, 1);
        ImageEntity.forItem("fileName2", "url2", item, 2);


        //  서비스의 메서드 단위로 트랜젝션 처리
        ItemEntity savedItem = itemRepository.save(item);

        // Then (확인용 조회)
        Optional<ItemEntity> foundItem = itemRepository.findById(savedItem.getItemId());
        assertThat(foundItem).isPresent();
        assertThat(foundItem.get()).isEqualTo(savedItem);
    }

    public void selectAll(){
        List<ImageEntity> imageEntities = new ArrayList<>();
        List<ItemEntity> itemEntities = itemRepository.findAll();
        assertThat(itemEntities).isNotEmpty();

    }
}
