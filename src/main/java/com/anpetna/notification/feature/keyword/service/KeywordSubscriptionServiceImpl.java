package com.anpetna.notification.feature.keyword.service;

import com.anpetna.board.constant.BoardType;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;
import com.anpetna.notification.feature.keyword.domain.KeywordSubscriptionEntity;
import com.anpetna.notification.feature.keyword.dto.CreateKeywordReq;
import com.anpetna.notification.feature.keyword.dto.DeleteKeywordRes;
import com.anpetna.notification.feature.keyword.dto.KeywordSubscriptionDTO;
import com.anpetna.notification.feature.keyword.dto.ListKeywordRes;
import com.anpetna.notification.feature.keyword.repository.KeywordSubscriptionRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class KeywordSubscriptionServiceImpl implements KeywordSubscriptionService {

    private final KeywordSubscriptionRepository repo;
    private final MemberRepository memberRepository;

    @Override
    @Transactional
    public KeywordSubscriptionDTO subscribe(String subscriberMemberId, CreateKeywordReq req) {
        // 1) 파라미터 검증
        if (subscriberMemberId == null || subscriberMemberId.isBlank()) {
            throw new IllegalArgumentException("subscriberMemberId is required");
        }
        if (req == null || req.getKeyword() == null || req.getKeyword().trim().isEmpty()) {
            throw new IllegalArgumentException("keyword must not be blank");
        }
        final String trimmed = req.getKeyword().trim();
        final BoardType scope = req.getScopeBoardType();

        // 2) 구독자 조회
        MemberEntity subscriber = memberRepository.findByMemberId(subscriberMemberId)
                .orElseThrow(() -> new EntityNotFoundException("member not found: " + subscriberMemberId));

        // 3) 중복 체크
        boolean exists = repo.existsBySubscriber_MemberIdAndKeywordAndScopeBoardType(
                subscriber.getMemberId(), trimmed, scope
        );
        if (exists) {
            throw new IllegalStateException("already subscribed: " + trimmed);
        }

        // 4) 저장 → DTO 변환
        try {
            KeywordSubscriptionEntity saved = repo.save(
                    KeywordSubscriptionEntity.builder()
                            .subscriber(subscriber)
                            .keyword(trimmed)
                            .scopeBoardType(scope)
                            .build()
            );
            return KeywordSubscriptionDTO.from(saved);
        } catch (DataIntegrityViolationException dup) {
            // 유니크 제약 동시성 충돌 방어
            throw new IllegalStateException("already subscribed: " + trimmed);
        }
    }

    @Override
    public ListKeywordRes listByMember(String subscriberMemberId) {
        if (subscriberMemberId == null || subscriberMemberId.isBlank()) {
            throw new IllegalArgumentException("subscriberMemberId is required");
        }
        List<KeywordSubscriptionEntity> entities = repo.findBySubscriber_MemberId(subscriberMemberId);
        var items = entities.stream().map(KeywordSubscriptionDTO::from).toList();
        return ListKeywordRes.of(items);
    }

    @Override
    @Transactional
    public DeleteKeywordRes unsubscribe(String subscriberMemberId, Long kId) {
        if (subscriberMemberId == null || subscriberMemberId.isBlank()) {
            throw new IllegalArgumentException("subscriberMemberId is required");
        }
        if (kId == null) {
            throw new IllegalArgumentException("kId is required");
        }

        // 소유자 검증 포함 조회
        KeywordSubscriptionEntity entity = repo.findById(kId)
                .orElseThrow(() -> new EntityNotFoundException("subscription not found: " + kId));

        if (!subscriberMemberId.equals(entity.getSubscriber().getMemberId())) {
            // 남의 구독 접근 차단(404처럼 처리)
            throw new EntityNotFoundException("subscription not found: " + kId);
        }

        repo.delete(entity);
        return DeleteKeywordRes.ok(kId);
    }

    @Override
    public List<KeywordSubscriptionEntity> loadCandidatesFor(BoardType boardType) {
        // 전체(null 스코프) + 특정 보드타입 스코프를 합쳐서 반환 (두 번 조회 방식 유지)
        List<KeywordSubscriptionEntity> result = new ArrayList<>();
        result.addAll(repo.findByScopeBoardTypeIsNull());
        if (boardType != null) {
            result.addAll(repo.findByScopeBoardType(boardType));
        }
        return result;
    }
}
