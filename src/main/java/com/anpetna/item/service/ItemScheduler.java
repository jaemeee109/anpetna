package com.anpetna.item.service;

import com.anpetna.item.constant.ItemRankingPeriod;
import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.dto.ItemSalesDTO;
import com.anpetna.item.dto.searchAllItem.SearchAllItemsRes;
import com.anpetna.item.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.ScheduledFuture;

@Component
@RequiredArgsConstructor
public class ItemScheduler {

    private final RedisTemplate<String, SearchAllItemsRes> redisTemplate;
    private final ItemRepository itemRepository;
    private final ModelMapper modelMapper;
    //월간 주간 하루 1시간 10분

    //  코드 작성자의 의도
    //  item 판매개수를 기준으로 랭킹화
    //  item readAll 페이지에서는 카테고리별 랭킹 확인 가능
    //  주기 설정은 메인 페이지용

    // 매월 1일 0시
    @Scheduled(cron = "0 0 0 1 * *")
    public void orderBySalesMonthly() {synchronizeCache(ItemRankingPeriod.MONTH);}

    // 매주 월요일 0시
    @Scheduled(cron = "0 0 0 * * MON")
    public void orderBySalesWeekly() {synchronizeCache(ItemRankingPeriod.WEEK);}

    // 매일 자정
    @Scheduled(cron = "0 0 0 * * *")
    public void orderBySalesDaily() {synchronizeCache(ItemRankingPeriod.DAY);}

    // 매시간 0분
    @Scheduled(cron = "0 0 * * * *")
    public void orderBySalesHourly() {synchronizeCache(ItemRankingPeriod.HOUR);}

    // 매 15분마다
    @Scheduled(cron = "0 */15 * * * *")
    public void orderBySalesQuarterHourly() {synchronizeCache(ItemRankingPeriod.HALF_HOUR);}

    private void synchronizeCache(ItemRankingPeriod period) {
        List<ItemSalesDTO> itemList = itemRepository.rankSalesQuantity();
        itemList.forEach(itemSalesDTO -> {
            String key = "sales:ranking:" + period + ":" + itemSalesDTO.getItemCategory();
            SearchAllItemsRes value =  modelMapper.map(itemSalesDTO.getItem(), SearchAllItemsRes.class);
            double score = itemSalesDTO.getQuantity();
            redisTemplate.opsForZSet().add(key, value, score);
        });
    }
}
