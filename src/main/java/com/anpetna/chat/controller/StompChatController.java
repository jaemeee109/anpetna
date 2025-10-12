package com.anpetna.chat.controller;

import com.anpetna.chat.dto.ChatMessageDTO;
import com.anpetna.chat.service.ChatService;;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.service.MemberService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping("/chats")
public class StompChatController {

    private final ChatService chatService;

    private final SimpMessagingTemplate messagingTemplate;

    private final MemberService memberService;

    // 메시지 전송(저장) REST 엔드포인트
    @PostMapping("/{chatroomId}/messages") // ⬅️ 변경 포인트 2: HTTP POST
    public ChatMessageDTO postMessage(Authentication authentication,
                                      @PathVariable Long chatroomId,
                                      @RequestBody Map<String, String> payload) {

        String text = payload.getOrDefault("message", "").trim();
        if (text.isEmpty()) {
            throw new IllegalArgumentException("내용을 입렵하세요.");
        }

        // 1) 저장
        String memberId = authentication.getName();
        MemberEntity member = memberService.findById(memberId);

        chatService.saveMessage(member, chatroomId, text);

        // 2) 실시간 알림(웹소켓 구독자에게 push) - STOMP 구독 채널은 기존 그대로 사용 가능
        messagingTemplate.convertAndSend("/sub/chats", new ChatMessageDTO(member.getMemberId(), text)); // 메인 피드
        messagingTemplate.convertAndSend("/sub/chats/updates", chatService.getChatroom(chatroomId)); // 보조 업데이트

        // 3) HTTP 응답(JSON)
        return new ChatMessageDTO(member.getMemberId(), text);
    }

    // 메시지 조회 REST 엔드포인트
    @GetMapping("/{chatroomId}/messages")
    public List<ChatMessageDTO> getMessages(@PathVariable Long chatroomId) {
        return chatService.getMessageList(chatroomId).stream()
                .map(m -> new ChatMessageDTO(
                        m.getMember().getMemberId(),
                        m.getText()
                ))
                .toList();
    }

}