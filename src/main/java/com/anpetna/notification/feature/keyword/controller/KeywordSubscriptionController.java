package com.anpetna.notification.feature.keyword.controller;

import com.anpetna.notification.feature.keyword.dto.CreateKeywordReq;
import com.anpetna.notification.feature.keyword.dto.DeleteKeywordRes;
import com.anpetna.notification.feature.keyword.dto.KeywordSubscriptionDTO;
import com.anpetna.notification.feature.keyword.dto.ListKeywordRes;
import com.anpetna.notification.feature.keyword.service.KeywordSubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/notification/keywords")
@RequiredArgsConstructor
public class KeywordSubscriptionController {

    private final KeywordSubscriptionService keywordSubscriptionService;

    @PostMapping
    public ResponseEntity<KeywordSubscriptionDTO> createKeywordSubscription(
            @AuthenticationPrincipal(expression = "username") String memberId,
            @Valid @RequestBody CreateKeywordReq req
    ) {
        KeywordSubscriptionDTO dto = keywordSubscriptionService.subscribe(memberId, req);
        return ResponseEntity.ok(dto);
    }

    @GetMapping
    public ResponseEntity<ListKeywordRes> listMySubscriptions(
            @AuthenticationPrincipal(expression = "username") String memberId
    ) {
        ListKeywordRes list = keywordSubscriptionService.listByMember(memberId);
        return ResponseEntity.ok(list);
    }

    @DeleteMapping("/{kId}")
    public ResponseEntity<DeleteKeywordRes> deleteKeywordSubscription(
            @AuthenticationPrincipal(expression = "username") String memberId,
            @PathVariable Long kId
    ) {
        DeleteKeywordRes result = keywordSubscriptionService.unsubscribe(memberId, kId);
        return ResponseEntity.ok(result);
    }
}
