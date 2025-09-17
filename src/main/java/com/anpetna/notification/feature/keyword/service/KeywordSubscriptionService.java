package com.anpetna.notification.feature.keyword.service;

import com.anpetna.board.constant.BoardType;
import com.anpetna.notification.feature.keyword.domain.KeywordSubscriptionEntity;
import com.anpetna.notification.feature.keyword.dto.CreateKeywordReq;
import com.anpetna.notification.feature.keyword.dto.DeleteKeywordRes;
import com.anpetna.notification.feature.keyword.dto.KeywordSubscriptionDTO;
import com.anpetna.notification.feature.keyword.dto.ListKeywordRes;

import java.util.List;

public interface KeywordSubscriptionService {

    KeywordSubscriptionDTO subscribe(String subscriberMemberId, CreateKeywordReq req);

    ListKeywordRes listByMember(String subscriberMemberId);

    DeleteKeywordRes unsubscribe(String subscriberMemberId, Long kId);

    List<KeywordSubscriptionEntity> loadCandidatesFor(BoardType boardType);
}
