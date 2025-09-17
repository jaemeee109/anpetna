package com.anpetna.notification.feature.keyword.repository;

import com.anpetna.board.constant.BoardType;
import com.anpetna.notification.feature.keyword.domain.KeywordSubscriptionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface KeywordSubscriptionRepository extends JpaRepository<KeywordSubscriptionEntity, Long> {

    // [중복 구독 방지] 동일 (subscriber, keyword, scopeBoardType)이 이미 있는지
    boolean existsBySubscriber_MemberIdAndKeywordAndScopeBoardType(String memberId, String keyword, BoardType scopeBoardType);

    // [매칭 후보 로드 - 1] 스코프가 전체(null)인 구독
    List<KeywordSubscriptionEntity> findByScopeBoardTypeIsNull();

    // [매칭 후보 로드 - 2] 특정 보드타입 스코프인 구독
    List<KeywordSubscriptionEntity> findByScopeBoardType(BoardType boardType);

    List<KeywordSubscriptionEntity> findBySubscriber_MemberId(String memberId);
}
